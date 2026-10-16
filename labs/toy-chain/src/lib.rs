//! Toy L1, course Unit 3: "A blockchain is a replicated state machine".
//!
//! Everything a node needs except networking and consensus:
//! - signed transfers with nonces and a chain id (replay protection)
//! - a deterministic state transition function (STF)
//! - blocks that commit to their parent, their transactions (tx root) and the post-state (state root)
//! - a mempool with deterministic ordering
//! - block validation by re-execution, which is what every follower node does
//!
//! Exercises (see README): Merkle proofs, fee priority, a 4-validator Tendermint round, an order-book module.

use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

pub type Hash = [u8; 32];
pub type Address = [u8; 32]; // the Ed25519 public key bytes

pub fn sha256(parts: &[&[u8]]) -> Hash {
    let mut h = Sha256::new();
    for p in parts {
        h.update(p);
    }
    h.finalize().into()
}

/// Binary Merkle root. Odd layers duplicate their last node. Empty tree = all-zero hash.
pub fn merkle_root(leaves: &[Hash]) -> Hash {
    if leaves.is_empty() {
        return [0u8; 32];
    }
    let mut layer: Vec<Hash> = leaves.to_vec();
    while layer.len() > 1 {
        if layer.len() % 2 == 1 {
            layer.push(*layer.last().unwrap());
        }
        layer = layer.chunks(2).map(|p| sha256(&[b"node", &p[0], &p[1]])).collect();
    }
    layer[0]
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Tx {
    pub chain_id: u64,
    pub from: Address,
    pub to: Address,
    pub amount: u64,
    pub nonce: u64,
    pub sig: [u8; 64],
}

impl Tx {
    /// Canonical bytes that get signed. Domain tag + chain id stop cross-chain replay.
    pub fn signing_bytes(chain_id: u64, from: &Address, to: &Address, amount: u64, nonce: u64) -> Vec<u8> {
        let mut b = Vec::with_capacity(4 + 8 + 32 + 32 + 8 + 8);
        b.extend_from_slice(b"BPTX");
        b.extend_from_slice(&chain_id.to_be_bytes());
        b.extend_from_slice(from);
        b.extend_from_slice(to);
        b.extend_from_slice(&amount.to_be_bytes());
        b.extend_from_slice(&nonce.to_be_bytes());
        b
    }

    pub fn new_signed(key: &SigningKey, chain_id: u64, to: Address, amount: u64, nonce: u64) -> Tx {
        let from = key.verifying_key().to_bytes();
        let sig = key.sign(&Self::signing_bytes(chain_id, &from, &to, amount, nonce)).to_bytes();
        Tx { chain_id, from, to, amount, nonce, sig }
    }

    pub fn hash(&self) -> Hash {
        sha256(&[&Self::signing_bytes(self.chain_id, &self.from, &self.to, self.amount, self.nonce), &self.sig])
    }

    pub fn verify_sig(&self) -> bool {
        let Ok(vk) = VerifyingKey::from_bytes(&self.from) else { return false };
        let msg = Self::signing_bytes(self.chain_id, &self.from, &self.to, self.amount, self.nonce);
        vk.verify(&msg, &Signature::from_bytes(&self.sig)).is_ok()
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Account {
    pub balance: u64,
    pub nonce: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum TxError {
    WrongChain,
    BadSignature,
    BadNonce { expected: u64, got: u64 },
    InsufficientBalance,
    SelfTransfer,
}

/// World state. BTreeMap (not HashMap) so iteration order, and therefore the state root, is deterministic.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct State {
    pub accounts: BTreeMap<Address, Account>,
}

impl State {
    pub fn account(&self, a: &Address) -> Account {
        self.accounts.get(a).copied().unwrap_or_default()
    }

    /// The state transition function for one transaction.
    pub fn apply_tx(&mut self, chain_id: u64, tx: &Tx) -> Result<(), TxError> {
        if tx.chain_id != chain_id {
            return Err(TxError::WrongChain);
        }
        if !tx.verify_sig() {
            return Err(TxError::BadSignature);
        }
        if tx.from == tx.to {
            return Err(TxError::SelfTransfer);
        }
        let sender = self.account(&tx.from);
        if sender.nonce != tx.nonce {
            return Err(TxError::BadNonce { expected: sender.nonce, got: tx.nonce });
        }
        if sender.balance < tx.amount {
            return Err(TxError::InsufficientBalance);
        }
        let s = self.accounts.entry(tx.from).or_default();
        s.balance -= tx.amount;
        s.nonce += 1;
        let r = self.accounts.entry(tx.to).or_default();
        r.balance = r.balance.checked_add(tx.amount).expect("total supply fits in u64");
        Ok(())
    }

    /// One leaf per account, in address order: H("acct" || addr || balance || nonce).
    pub fn state_root(&self) -> Hash {
        let leaves: Vec<Hash> = self
            .accounts
            .iter()
            .map(|(a, acc)| sha256(&[b"acct", a, &acc.balance.to_be_bytes(), &acc.nonce.to_be_bytes()]))
            .collect();
        merkle_root(&leaves)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Header {
    pub height: u64,
    pub parent_hash: Hash,
    pub tx_root: Hash,
    pub state_root: Hash,
    pub timestamp: u64,
    pub proposer: Address,
}

impl Header {
    pub fn hash(&self) -> Hash {
        sha256(&[
            b"hdr",
            &self.height.to_be_bytes(),
            &self.parent_hash,
            &self.tx_root,
            &self.state_root,
            &self.timestamp.to_be_bytes(),
            &self.proposer,
        ])
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Block {
    pub header: Header,
    pub txs: Vec<Tx>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum BlockError {
    WrongHeight,
    WrongParent,
    TxRootMismatch,
    InvalidTx(usize, TxError),
    StateRootMismatch,
}

/// A single node's view: the chain so far, the current state and a mempool.
#[derive(Clone, Debug)]
pub struct Node {
    pub chain_id: u64,
    pub state: State,
    pub blocks: Vec<Block>,
    pub mempool: Vec<Tx>,
}

impl Node {
    /// Genesis: block 0 commits to the initial balances.
    pub fn new(chain_id: u64, genesis: &[(Address, u64)]) -> Node {
        let mut state = State::default();
        for (a, bal) in genesis {
            state.accounts.insert(*a, Account { balance: *bal, nonce: 0 });
        }
        let header = Header {
            height: 0,
            parent_hash: [0u8; 32],
            tx_root: merkle_root(&[]),
            state_root: state.state_root(),
            timestamp: 0,
            proposer: [0u8; 32],
        };
        Node { chain_id, state, blocks: vec![Block { header, txs: vec![] }], mempool: vec![] }
    }

    pub fn head(&self) -> &Block {
        self.blocks.last().expect("genesis exists")
    }

    /// Mempool admission: cheap checks only. Full validity is decided at execution time.
    pub fn submit(&mut self, tx: Tx) -> Result<(), TxError> {
        if tx.chain_id != self.chain_id {
            return Err(TxError::WrongChain);
        }
        if !tx.verify_sig() {
            return Err(TxError::BadSignature);
        }
        let acct = self.state.account(&tx.from);
        if tx.nonce < acct.nonce {
            return Err(TxError::BadNonce { expected: acct.nonce, got: tx.nonce });
        }
        if !self.mempool.iter().any(|t| t.hash() == tx.hash()) {
            self.mempool.push(tx);
        }
        Ok(())
    }

    /// Proposer path: order the mempool deterministically, keep the txs that apply, seal a block.
    pub fn produce_block(&mut self, proposer: Address, timestamp: u64) -> Block {
        let mut candidates = std::mem::take(&mut self.mempool);
        candidates.sort_by(|a, b| (a.from, a.nonce).cmp(&(b.from, b.nonce)));
        let mut post = self.state.clone();
        let mut included = vec![];
        for tx in candidates {
            match post.apply_tx(self.chain_id, &tx) {
                Ok(()) => included.push(tx),
                Err(TxError::BadNonce { expected, got }) if got > expected => self.mempool.push(tx), // future nonce: keep
                Err(_) => {} // drop invalid
            }
        }
        let header = Header {
            height: self.head().header.height + 1,
            parent_hash: self.head().header.hash(),
            tx_root: merkle_root(&included.iter().map(Tx::hash).collect::<Vec<_>>()),
            state_root: post.state_root(),
            timestamp,
            proposer,
        };
        let block = Block { header, txs: included };
        self.state = post;
        self.blocks.push(block.clone());
        block
    }

    /// Follower path: re-execute and check every commitment before accepting.
    pub fn apply_block(&mut self, block: &Block) -> Result<(), BlockError> {
        let h = &block.header;
        if h.height != self.head().header.height + 1 {
            return Err(BlockError::WrongHeight);
        }
        if h.parent_hash != self.head().header.hash() {
            return Err(BlockError::WrongParent);
        }
        if h.tx_root != merkle_root(&block.txs.iter().map(Tx::hash).collect::<Vec<_>>()) {
            return Err(BlockError::TxRootMismatch);
        }
        let mut post = self.state.clone();
        for (i, tx) in block.txs.iter().enumerate() {
            post.apply_tx(self.chain_id, tx).map_err(|e| BlockError::InvalidTx(i, e))?;
        }
        if post.state_root() != h.state_root {
            return Err(BlockError::StateRootMismatch);
        }
        let included: Vec<Hash> = block.txs.iter().map(Tx::hash).collect();
        self.mempool.retain(|t| !included.contains(&t.hash()));
        self.state = post;
        self.blocks.push(block.clone());
        Ok(())
    }
}

pub fn key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

pub fn addr(k: &SigningKey) -> Address {
    k.verifying_key().to_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

    const CHAIN: u64 = 7;

    fn setup() -> (Node, SigningKey, SigningKey) {
        let (alice, bob) = (key(1), key(2));
        let node = Node::new(CHAIN, &[(addr(&alice), 1_000), (addr(&bob), 50)]);
        (node, alice, bob)
    }

    #[test]
    fn transfer_moves_balance_and_bumps_nonce() {
        let (mut n, alice, bob) = setup();
        n.submit(Tx::new_signed(&alice, CHAIN, addr(&bob), 300, 0)).unwrap();
        let b = n.produce_block(addr(&alice), 1);
        assert_eq!(b.txs.len(), 1);
        assert_eq!(n.state.account(&addr(&alice)), Account { balance: 700, nonce: 1 });
        assert_eq!(n.state.account(&addr(&bob)).balance, 350);
    }

    #[test]
    fn replay_is_rejected_by_nonce() {
        let (mut n, alice, bob) = setup();
        let tx = Tx::new_signed(&alice, CHAIN, addr(&bob), 10, 0);
        n.submit(tx.clone()).unwrap();
        n.produce_block(addr(&alice), 1);
        assert_eq!(n.submit(tx), Err(TxError::BadNonce { expected: 1, got: 0 }));
    }

    #[test]
    fn other_chain_signature_is_rejected() {
        let (mut n, alice, bob) = setup();
        let tx = Tx::new_signed(&alice, CHAIN + 1, addr(&bob), 10, 0);
        assert_eq!(n.submit(tx), Err(TxError::WrongChain));
    }

    #[test]
    fn tampered_amount_breaks_signature() {
        let (mut n, alice, bob) = setup();
        let mut tx = Tx::new_signed(&alice, CHAIN, addr(&bob), 10, 0);
        tx.amount = 999;
        assert_eq!(n.submit(tx), Err(TxError::BadSignature));
    }

    #[test]
    fn overspend_is_dropped_not_included() {
        let (mut n, alice, bob) = setup();
        n.submit(Tx::new_signed(&bob, CHAIN, addr(&alice), 51, 0)).unwrap();
        let b = n.produce_block(addr(&bob), 1);
        assert!(b.txs.is_empty());
    }

    #[test]
    fn future_nonce_waits_in_mempool() {
        let (mut n, alice, bob) = setup();
        n.submit(Tx::new_signed(&alice, CHAIN, addr(&bob), 5, 1)).unwrap(); // nonce 1 before 0
        assert!(n.produce_block(addr(&alice), 1).txs.is_empty());
        assert_eq!(n.mempool.len(), 1);
        n.submit(Tx::new_signed(&alice, CHAIN, addr(&bob), 5, 0)).unwrap();
        assert_eq!(n.produce_block(addr(&alice), 2).txs.len(), 2);
    }

    #[test]
    fn followers_reach_identical_state_root() {
        let (mut proposer, alice, bob) = setup();
        let mut follower = proposer.clone();
        for i in 0..5 {
            proposer.submit(Tx::new_signed(&alice, CHAIN, addr(&bob), 10 + i, i)).unwrap();
        }
        let b1 = proposer.produce_block(addr(&alice), 1);
        proposer.submit(Tx::new_signed(&bob, CHAIN, addr(&alice), 7, 0)).unwrap();
        let b2 = proposer.produce_block(addr(&alice), 2);
        follower.apply_block(&b1).unwrap();
        follower.apply_block(&b2).unwrap();
        assert_eq!(follower.state.state_root(), proposer.state.state_root());
        assert_eq!(follower.head().header.hash(), proposer.head().header.hash());
    }

    #[test]
    fn follower_rejects_lying_state_root() {
        let (mut proposer, alice, bob) = setup();
        let mut follower = proposer.clone();
        proposer.submit(Tx::new_signed(&alice, CHAIN, addr(&bob), 10, 0)).unwrap();
        let mut b = proposer.produce_block(addr(&alice), 1);
        b.header.state_root[0] ^= 1; // a malicious proposer claims a different post-state
        assert_eq!(follower.apply_block(&b), Err(BlockError::StateRootMismatch));
    }

    #[test]
    fn follower_rejects_unsigned_injection() {
        let (mut proposer, alice, bob) = setup();
        let mut follower = proposer.clone();
        let mut b = proposer.produce_block(addr(&alice), 1);
        let mut forged = Tx::new_signed(&bob, CHAIN, addr(&bob), 1, 0);
        forged.from = addr(&alice); // steal from alice with bob's signature
        forged.to = addr(&bob);
        b.txs.push(forged);
        b.header.tx_root = merkle_root(&b.txs.iter().map(Tx::hash).collect::<Vec<_>>());
        assert!(matches!(follower.apply_block(&b), Err(BlockError::InvalidTx(0, TxError::BadSignature))));
    }

    #[test]
    fn merkle_root_is_order_sensitive_and_deterministic() {
        let a = sha256(&[b"a"]);
        let b = sha256(&[b"b"]);
        assert_eq!(merkle_root(&[a, b]), merkle_root(&[a, b]));
        assert_ne!(merkle_root(&[a, b]), merkle_root(&[b, a]));
        assert_eq!(merkle_root(&[a, b, a]), merkle_root(&[a, b, a, a]));
    }
}
