function getConfig(env, options = {}) {
    const config = {
        ...options,
        appTitle: options.appTitle || 'NEAR',
        contractName: options.contractName || process.env.CONTRACT_NAME || 'test.near',
    }

    switch (env) {
        case 'production':
        case 'mainnet':
            return {
                ...config,
                networkId: 'mainnet',
                nodeUrl: 'https://rpc.mainnet.near.org',
                explorerUrl: 'https://explorer.near.org',
                walletUrl: 'https://wallet.near.org',
                helperUrl: 'https://helper.mainnet.near.org'
            }
        case 'development':
        case 'testnet':
            return {
                ...config,
                networkId: 'default',
                nodeUrl: 'https://rpc.testnet.near.org',
                explorerUrl: 'https://explorer.testnet.near.org',
                walletUrl: 'https://wallet.testnet.near.org',
                helperUrl: 'https://helper.testnet.near.org'
            }
        case 'betanet':
            return {
                ...config,
                networkId: 'betanet',
                nodeUrl: 'https://rpc.betanet.near.org',
                explorerUrl: 'https://explorer.betanet.near.org',
                walletUrl: 'https://wallet.betanet.near.org',
                helperUrl: 'https://helper.betanet.near.org'
            }
        case 'local':
            return {
                ...config,
                networkId: 'local',
                nodeUrl: 'http://localhost:3030',
                keyPath: `${process.env.HOME}/.near/validator_key.json`,
                walletUrl: 'http://localhost:4000/wallet',
            }
        case 'test':
        case 'ci':
            return {
                ...config,
                networkId: 'shared-test',
                nodeUrl: 'https://rpc.ci-testnet.near.org',
                masterAccount: 'test.near'
            }
        case 'ci-betanet':
            return {
                ...config,
                networkId: 'shared-test-staging',
                nodeUrl: 'https://rpc.ci-betanet.near.org',
                masterAccount: 'test.near'
            }
        default:
            throw Error(`Unconfigured environment '${env}'. Can be configured in src/config.js.`)
    }
}

module.exports = getConfig;
