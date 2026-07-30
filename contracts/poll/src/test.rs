#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Env};

#[test]
fn test_full_poll_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    let question = String::from_str(&env, "Rust or JavaScript?");
    let options = vec![
        &env,
        String::from_str(&env, "Rust"),
        String::from_str(&env, "JavaScript"),
    ];

    client.init(&admin, &question, &options);

    assert_eq!(client.get_question(), question);
    assert_eq!(client.get_results(), vec![&env, 0, 0]);

    client.vote(&voter1, &0);
    client.vote(&voter2, &1);

    assert_eq!(client.get_results(), vec![&env, 1, 1]);
    assert!(client.has_voted(&voter1));
}

#[test]
#[should_panic(expected = "address has already voted")]
fn test_double_vote_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PollContract);
    let client = PollContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);

    let question = String::from_str(&env, "Cats or Dogs?");
    let options = vec![
        &env,
        String::from_str(&env, "Cats"),
        String::from_str(&env, "Dogs"),
    ];

    client.init(&admin, &question, &options);
    client.vote(&voter, &0);
    client.vote(&voter, &1); // should panic
}
