//! Demo: one proposer and one follower agree on three blocks.
use toy_chain::{addr, key, Node, Tx};

fn short(h: &[u8; 32]) -> String {
    hex::encode(&h[..6])
}

fn main() {
    let chain_id = 7;
    let (alice, bob, carol) = (key(1), key(2), key(3));
    let genesis = [(addr(&alice), 1_000_000), (addr(&bob), 5_000)];
    let mut proposer = Node::new(chain_id, &genesis);
    let mut follower = Node::new(chain_id, &genesis);
    println!("genesis state_root={}", short(&proposer.state.state_root()));

    let plan = [
        vec![Tx::new_signed(&alice, chain_id, addr(&bob), 250, 0), Tx::new_signed(&bob, chain_id, addr(&carol), 100, 0)],
        vec![Tx::new_signed(&alice, chain_id, addr(&carol), 1_000, 1)],
        vec![Tx::new_signed(&carol, chain_id, addr(&alice), 99, 0), Tx::new_signed(&bob, chain_id, addr(&alice), 999_999, 1)],
    ];
    for (i, txs) in plan.into_iter().enumerate() {
        for tx in txs {
            proposer.submit(tx).expect("admitted");
        }
        let block = proposer.produce_block(addr(&alice), 1_700_000_000 + i as u64 * 2);
        follower.apply_block(&block).expect("follower accepts");
        println!(
            "block {} txs={} hash={} state_root={} follower_agrees={}",
            block.header.height,
            block.txs.len(),
            short(&block.header.hash()),
            short(&block.header.state_root),
            follower.state.state_root() == proposer.state.state_root()
        );
    }
    for (name, k) in [("alice", &alice), ("bob", &bob), ("carol", &carol)] {
        let a = proposer.state.account(&addr(k));
        println!("{name:>5}: balance={} nonce={}", a.balance, a.nonce);
    }
}
