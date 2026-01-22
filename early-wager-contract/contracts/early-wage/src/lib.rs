#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Map, Symbol,
};

#[contract]
pub struct EarlyWageContract;

const EMP_COUNT: Symbol = symbol_short!("EMP_COUNT");
const EMP_DETAILS: Symbol = symbol_short!("EMP_DET");
const WALLET_TO_ID: Symbol = symbol_short!("wal2id");

#[contracttype]
pub struct EmployeeDetails {
    pub emp_id: u128,
    pub wallet: Address,
    pub rem_salary: u128,
}

fn distribute_for_demo(e: &Env, sender: Address, add1: Address, add2: Address, token: Address) {
    sender.require_auth();
    let token = token::TokenClient::new(e, &token);

    token.transfer_from(&sender, &sender, &add1, &1000);
    token.transfer_from(&sender, &sender, &add2, &1000);
}

#[contractimpl]
impl EarlyWageContract {
    pub fn register_employee(e: Env, wallet: Address, salary: u128) {
        let mut wallet_map: Map<Address, u128> = e
            .storage()
            .instance()
            .get(&WALLET_TO_ID)
            .unwrap_or(Map::new(&e));

        if wallet_map.contains_key(wallet.clone()) {
            panic!("Wallet already registered");
        }

        let mut emp_id: u128 = e.storage().instance().get(&EMP_COUNT).unwrap_or(0);
        emp_id += 1;

        let mut emp_map: Map<u128, EmployeeDetails> = e
            .storage()
            .instance()
            .get(&EMP_DETAILS)
            .unwrap_or(Map::new(&e));

        emp_map.set(
            emp_id,
            EmployeeDetails {
                emp_id,
                wallet: wallet.clone(),
                rem_salary: salary,
            },
        );
        wallet_map.set(wallet, emp_id);

        e.storage().instance().set(&EMP_DETAILS, &emp_map);
        e.storage().instance().set(&WALLET_TO_ID, &wallet_map);
        e.storage().instance().set(&EMP_COUNT, &emp_id);
    }

    pub fn deposit_to_vault(e: Env, from: Address, amount: i128, token: Address) {
        from.require_auth();

        let client = token::Client::new(&e, &token);
        client.transfer(&from, &e.current_contract_address(), &amount);
    }

    pub fn request_advance(e: &Env, emp_id: u128, amount: i128, token: Address) {
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let mut emp_map: Map<u128, EmployeeDetails> = e
            .storage()
            .instance()
            .get(&EMP_DETAILS)
            .unwrap_or(Map::new(e));

        let mut emp = emp_map.get(emp_id).unwrap();

        if amount as u128 >= emp.rem_salary {
            panic!("Requested amount exceeded remaining salary");
        }

        let fee = amount * 125 / 10000;
        let final_amount = amount - fee;

        let client = token::Client::new(e, &token);

        client.transfer(&e.current_contract_address(), &emp.wallet, &final_amount);

        emp.rem_salary -= amount as u128;
        emp_map.set(emp_id, emp);

        e.storage().instance().set(&EMP_DETAILS, &emp_map);
    }

    pub fn vault_balance(e: Env, token: Address) -> i128 {
        let client = token::Client::new(&e, &token);
        client.balance(&e.current_contract_address())
    }

    pub fn get_emp_details(e: Env, emp_id: u128) -> EmployeeDetails {
        let emp_map: Map<u128, EmployeeDetails> = e
            .storage()
            .instance()
            .get(&EMP_DETAILS)
            .unwrap_or(Map::new(&e));
        emp_map.get(emp_id).unwrap()
    }

    pub fn release_remaining_salary(e: Env, emp_id: u128, token: Address, salary: u128) {
        let mut emp_map: Map<u128, EmployeeDetails> = e
            .storage()
            .instance()
            .get(&EMP_DETAILS)
            .unwrap_or(Map::new(&e));

        let mut emp = emp_map.get(emp_id).unwrap();

        if emp.rem_salary == 0 {
            panic!("No remaining salary to release");
        }

        let client = token::Client::new(&e, &token);

        client.transfer(
            &e.current_contract_address(),
            &emp.wallet,
            &(emp.rem_salary as i128),
        );

        emp.rem_salary = salary;
        emp_map.set(emp_id, emp);

        e.storage().instance().set(&EMP_DETAILS, &emp_map);
    }

    pub fn get_remaining_salary(e: Env, emp_id: u128) -> u128 {
        let emp_map: Map<u128, EmployeeDetails> = e
            .storage()
            .instance()
            .get(&EMP_DETAILS)
            .unwrap_or(Map::new(&e));

        let emp = emp_map.get(emp_id).unwrap();

        emp.rem_salary
    }
}
