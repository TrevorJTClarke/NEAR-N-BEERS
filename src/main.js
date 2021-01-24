import "regenerator-runtime/runtime";

import * as nearAPI from "near-api-js"
import getConfig from "./config"

const BN = require('bn.js');

let nearConfig = getConfig(process.env.NODE_ENV || "development");
window.nearConfig = nearConfig;

// Initializing contract
async function InitContract() {
    console.log('nearConfig', nearConfig);

    // Initializing connection to the NEAR DevNet.
    window.near = await nearAPI.connect(Object.assign({ deps: { keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore() } }, nearConfig));

    // Initializing Wallet based Account. It can work with NEAR DevNet wallet that
    // is hosted at https://wallet.nearprotocol.com
    window.walletAccount = new nearAPI.WalletAccount(window.near);

    // Getting the Account ID. If unauthorized yet, it's just empty string.
    window.accountId = window.walletAccount.getAccountId();

    const query = new URLSearchParams(window.location.search);
    const pollId = query.get('poll_id');
    window.voteState = {
        voteOwner: window.accountId,
        pollId: pollId
    };

    // Initializing our contract APIs by contract name and configuration.
    window.contract = await near.loadContract(nearConfig.contractName, { // eslint-disable-line require-atomic-updates
        // NOTE: This configuration only needed while NEAR is still in development
        // View methods are read only. They don't modify the state, but usually return some value.
        viewMethods: ['show_poll', 'show_results', 'ping'],
        // Change methods can modify the state. But you don't receive the returned value when called.
        changeMethods: ['vote', 'create_poll'],
        // Sender is the account ID to initialize transactions.
        sender: window.accountId,
    });
}

// Using initialized contract
async function doWork() {
    // Based on whether you've authorized, checking which flow we should go.
    if (!window.walletAccount.isSignedIn()) {
        signedOutFlow();
    } else {
        signedInFlow();
    }
}

// Function that initializes the signIn button using WalletAccount
function signedOutFlow() {
    // Displaying the signed out flow container.
    document.getElementById('signed-out-flow').classList.remove('d-none');
    // Adding an event to a sing-in button.
    document.getElementById('sign-in-button').addEventListener('click', () => {
        window.walletAccount.requestSignIn(
            // The contract name that would be authorized to be called by the user's account.
            window.nearConfig.contractName,
            // This is the app name. It can be anything.
            'Voting app'
        );
    });
}

// Main function for the signed-in flow (already authorized by the wallet).
function signedInFlow() {
    // Displaying the signed in flow container.
    document.getElementById('signed-in-flow').classList.remove('d-none');

    show_poll();

    // Adding an event to a sign-out button.
    document.getElementById('sign-out-button').addEventListener('click', () => {
        walletAccount.signOut();
        // Forcing redirect.
        window.location.replace(window.location.origin + window.location.pathname);
    });

    document.getElementById('vote-button').addEventListener('click', () => {
        const voteOptions = document.getElementById('vote-options');
        if (!voteOptions || voteOptions.style.display == 'none') {
            show_poll();
        } else {
            vote();
        }
    });

    document.getElementById('show-results-button').addEventListener('click', () => {
        show_poll_results();
    });

    document.getElementById('create-poll-button').addEventListener('click', () => {
        show_create_poll();
    });

    document.getElementById('create-poll-add-variant').addEventListener('click', () => {
        add_poll_variant();
    });

    document.getElementById('create-poll-remove-variant').addEventListener('click', () => {
        remove_poll_variant();
    });

    document.getElementById('create-poll-submit').addEventListener('click', () => {
        create_poll();
    });

    document.getElementById('create-poll-cancel').addEventListener('click', () => {
        // TODO: clear state in form?
        hide_create_poll();
    });
}

async function show_poll() {
    if (!window.voteState.pollId) return;
    const response = await window.contract.show_poll( { poll_id: window.voteState.pollId } );
    if (!response) {
        voting_app('No such poll ' + window.voteState.pollId);
        return;
    }
    const voteForm = document.createElement('div');
    voteForm.id = 'vote-form';
    const fieldsetElement = document.createElement('fieldset');
    const legendElement = document.createElement('legend');
    legendElement.innerText = "Dear @" + window.accountId + " please vote on poll by @" + response.creator;
    const questionElement = document.createElement('div');
    questionElement.className = 'vote_question';
    questionElement.innerText = response.question;
    legendElement.appendChild(questionElement);

    for (var index = 0; index < response.variants.length; index++) {
        const v = response.variants[index];
        const checkboxElement = document.createElement('input');
        checkboxElement.type = 'checkbox';
        checkboxElement.id = v.option_id;
        checkboxElement.value = v.option_id;
        const labelElement = document.createElement('label');
        labelElement.for = v.option_id;
        labelElement.innerText = v.message;
        fieldsetElement.appendChild(checkboxElement);
        fieldsetElement.appendChild(labelElement);
        fieldsetElement.appendChild(document.createElement('br'));
    }
    voteForm.appendChild(legendElement);
    voteForm.appendChild(fieldsetElement);

    const voteOptions = document.getElementById('vote-options');
    voteOptions.replaceChild(voteForm, voteOptions.firstChild);
    voteOptions.style.display = 'inline';
    hide_poll_results();
    document.getElementById('vote-button').style.display = 'inline';
    document.getElementById('show-results-button').style.display = 'inline';
}

function format_variant(poll, results, index) {
    const voted = results.variants[poll.variants[index].option_id];
    return poll.variants[index].message + ' -> ' + (voted ? voted : 0);
}

async function show_poll_results() {
    if (!window.voteState.pollId) return;
    voting_app("Talking to the blockchain...");
    const response = await window.contract.show_results({ poll_id: window.voteState.pollId } );
    voting_app("Ready!");
    if (!response) {
        return;
    }

    document.getElementById('poll-results-form').style.display = 'block';
    hide_create_poll();
    hide_poll_variants();

    const newHolder = document.createElement('div');
    const questionItem = document.createElement('div');
    questionItem.id = 'result-poll-question';
    questionItem.className = 'vote_question';
    questionItem.innerText = response.poll.question;
    newHolder.appendChild(questionItem);


    for (var index = 0; index < response.poll.variants.length; index++) {
        const variantItem = document.createElement('div');
        variantItem.className = 'vote_options';
        variantItem.innerText = format_variant(response.poll, response.results, index);
        newHolder.appendChild(variantItem);
    }
    const votedItem = document.createElement('div');
    votedItem.id = 'result-poll-voted';
    votedItem.className = 'voted';
    votedItem.innerText = 'Voted: ' + Object.keys(response.results.voted).join(" ");
    newHolder.appendChild(votedItem);

    console.log(newHolder);

    const resultsForm = document.getElementById('poll-results-form');
    resultsForm.replaceChild(newHolder, resultsForm.firstElementChild);

    document.getElementById('vote-options').style.display = 'none';
}

async function create_poll() {
    const question = document.getElementById("new-poll-question").value;
    var index = 1;
    const variants = {};
    while (true) {
        const v = document.getElementById("new-poll-v" + index);
        if (!v) break;
        variants['v' + index] = v.value;
        index++;
    }
    // Creation of poll and voting need more gas to execute.
    voting_app("Talking to the blockchain...");
    const poll = await window.contract.create_poll({question: question, variants: variants},
        new BN(10000000000000));
    voting_app("Ready, created " + poll);
    const base = document.documentURI.substr(0, document.documentURI.lastIndexOf('/'));
    const poll_address = base + "/?poll_id=" + poll;
    document.getElementById("new-poll-address").innerHTML = 'Newly created poll at <a href="' + poll_address + '">' + poll_address + '</a>';
    hide_create_poll();
}

async function vote() {
    const voteForm = document.getElementById('vote-form');
    const variants = voteForm.getElementsByTagName('input');
    const votes = {};
    for (var i = 0; i < variants.length; i++) {
        const variant = variants[i];
        votes[variant.id] = variant.checked ? 1 : 0 ;
    }
    // Creation of poll and voting needs more gas to execute.
    voting_app("Talking to the blockchain...");
    const result = await window.contract.vote({poll_id: window.voteState.pollId, votes: votes},
        new BN(10000000000000));
    voting_app("Your voice is " + (result ? "counted" : "NOT counted, already voted?"));
}

// Loads near-api-js and this contract into window scope.
window.nearInitPromise = InitContract()
    .then(doWork)
    .catch(console.error);


function show_create_poll() {
    const newPollForm = document.getElementById('new-poll-form');
    newPollForm.style.display = 'block';
    hide_poll_results();
    hide_poll_variants();
}

function hide_create_poll() {
    const newPollForm = document.getElementById('new-poll-form');
    newPollForm.style.display = 'none';
}

function hide_poll_results() {
    document.getElementById('poll-results-form').style.display = 'none';
}

function voting_app(text) {
    document.getElementById('status-message-bar').innerText = text;
}

function hide_poll_variants() {
    const vote = document.getElementById('vote-options');
    if (vote) vote.style.display = 'none';
}

function add_poll_variant() {
    const newPollList = document.getElementById('new-poll-form-variants');
    const index = newPollList.childElementCount + 1;
    const newVariantId = "new-poll-v" + index;
    const newVariantInput = document.createElement("input");
    newVariantInput.type = 'text';
    newVariantInput.id = newVariantId;
    const newVariantLabel = document.createElement("label");
    newVariantLabel.innerText = 'Variant ' + index + ': ';
    newVariantLabel.for = newVariantId;
    const newVariant = document.createElement("li");
    newVariant.appendChild(newVariantLabel);
    newVariant.appendChild(newVariantInput);
    newPollList.appendChild(newVariant);
}

function remove_poll_variant() {
    const newPollList = document.getElementById('new-poll-form-variants');
    newPollList.removeChild(newPollList.lastChild);
}