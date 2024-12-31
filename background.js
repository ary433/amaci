// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Initialize storage with default values
        chrome.storage.local.set({
            keys: [],
            history: [],
            network: 'mainnet',
            theme: 'light'
        });
    }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'ENCRYPT_DATA':
            // Implement encryption logic
            break;
        case 'DECRYPT_DATA':
            // Implement decryption logic
            break;
        case 'VERIFY_SIGNATURE':
            // Implement signature verification
            break;
    }
    return true;
});

// Handle network changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.network) {
        // Update network configuration
        const newNetwork = changes.network.newValue;
        updateNetworkConfig(newNetwork);
    }
});

function updateNetworkConfig(network) {
    // Update network-specific configurations
    const configs = {
        mainnet: {
            rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
            chainId: 1
        },
        testnet: {
            rpcUrl: 'https://goerli.infura.io/v3/YOUR-PROJECT-ID',
            chainId: 5
        }
    };
    
    chrome.storage.local.set({ networkConfig: configs[network] });
}
