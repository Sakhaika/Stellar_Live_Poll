#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

/// Storage keys used by the contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Question,
    Options,
    Votes,     // Vec<u32> - vote count per option index
    Voters,    // Vec<Address> - who already voted (prevents double voting)
    Initialized,
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    /// Initialize the poll. Can only be called once.
    /// `options` must have at least 2 entries.
    pub fn init(env: Env, admin: Address, question: String, options: Vec<String>) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("poll already initialized");
        }
        if options.len() < 2 {
            panic!("poll needs at least 2 options");
        }

        admin.require_auth();

        let mut votes: Vec<u32> = Vec::new(&env);
        for _ in 0..options.len() {
            votes.push_back(0);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::Votes, &votes);
        env.storage()
            .instance()
            .set(&DataKey::Voters, &Vec::<Address>::new(&env));
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Keep the contract's storage alive on testnet.
        env.storage().instance().extend_ttl(535_000, 535_000);
    }

    /// Cast a vote for `option_index`. Each address can vote only once.
    /// Requires signature (auth) from `voter`.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        let options: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::Options)
            .unwrap_or_else(|| panic!("poll not initialized"));

        if option_index as u32 >= options.len() {
            panic!("invalid option index");
        }

        let mut voters: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Voters)
            .unwrap_or_else(|| Vec::new(&env));

        for v in voters.iter() {
            if v == voter {
                panic!("address has already voted");
            }
        }

        let mut votes: Vec<u32> = env.storage().instance().get(&DataKey::Votes).unwrap();
        let current = votes.get(option_index).unwrap();
        votes.set(option_index, current + 1);

        voters.push_back(voter.clone());

        env.storage().instance().set(&DataKey::Votes, &votes);
        env.storage().instance().set(&DataKey::Voters, &voters);
        env.storage().instance().extend_ttl(535_000, 535_000);

        // Emit an event so the frontend can listen and sync in real-time.
        env.events()
            .publish((symbol_short!("vote"), voter), option_index);
    }

    pub fn get_question(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Question)
            .unwrap_or_else(|| panic!("poll not initialized"))
    }

    pub fn get_options(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::Options)
            .unwrap_or_else(|| panic!("poll not initialized"))
    }

    pub fn get_results(env: Env) -> Vec<u32> {
        env.storage()
            .instance()
            .get(&DataKey::Votes)
            .unwrap_or_else(|| panic!("poll not initialized"))
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Voters)
            .unwrap_or_else(|| Vec::new(&env));

        for v in voters.iter() {
            if v == voter {
                return true;
            }
        }
        false
    }
}

mod test;
