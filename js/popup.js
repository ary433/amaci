// MACI Crypto functionality
const MACICrypto = {
    async generateRandomPrivateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async generateKeypair() {
        try {
            const privateKey = await this.generateRandomPrivateKey();
            const privateKeyBytes = new TextEncoder().encode(privateKey);
            const hashBuffer = await crypto.subtle.digest('SHA-512', privateKeyBytes);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            
            // First 32 bytes for key, last 32 bytes for nonce
            const keyBytes = hashArray.slice(0, 32);
            const nonceBytes = hashArray.slice(32);
            
            // Simulate EdDSA point multiplication
            const publicKeyBytes = await crypto.subtle.digest(
                'SHA-256',
                new Uint8Array([...keyBytes, ...nonceBytes])
            );
            
            const publicKey = Array.from(new Uint8Array(publicKeyBytes))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            return {
                privateKey,
                publicKey,
                keyType: 'EdDSA-Ed25519'
            };
        } catch (error) {
            console.error('Error in generateKeypair:', error);
            throw new Error('Failed to generate EdDSA keypair');
        }
    },

    async signMessage(message, privateKey) {
        try {
            const messageBytes = new TextEncoder().encode(message);
            const keyBytes = new TextEncoder().encode(privateKey);
            const combined = new Uint8Array([...messageBytes, ...keyBytes]);
            
            const signature = await crypto.subtle.digest('SHA-256', combined)
                .then(hash => Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(''));

            return signature;
        } catch (error) {
            console.error('Error in signMessage:', error);
            throw new Error('Failed to sign message');
        }
    },

    encryptPrivateKey(privateKey, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
            
            const keyBytes = new TextEncoder().encode(privateKey);
            const passBytes = new TextEncoder().encode(password);
            const encrypted = new Uint8Array(keyBytes.length);
            
            for (let i = 0; i < keyBytes.length; i++) {
                encrypted[i] = keyBytes[i] ^ passBytes[i % passBytes.length];
            }

            const encryptedHex = Array.from(encrypted)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            return {
                encryptedKey: encryptedHex,
                salt: saltHex
            };
        } catch (error) {
            console.error('Error in encryptPrivateKey:', error);
            throw new Error('Failed to encrypt private key');
        }
    },

    decryptPrivateKey(encryptedKey, password, salt) {
        try {
            const encBytes = new Uint8Array(encryptedKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const passBytes = new TextEncoder().encode(password);
            const decrypted = new Uint8Array(encBytes.length);
            
            for (let i = 0; i < encBytes.length; i++) {
                decrypted[i] = encBytes[i] ^ passBytes[i % passBytes.length];
            }

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Error in decryptPrivateKey:', error);
            throw new Error('Failed to decrypt private key');
        }
    }
};

class MAICKeyManager {
    constructor() {
        this.currentAccount = null;
        this.keys = [];
        this.password = null;
        this.history = [];
        this.initializeUI();
        this.loadTheme();
    }

    initializeUI() {
        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const password = document.getElementById('password').value;
                    this.login(password);
                });
            }

            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }

            this.initializeButtons();
            this.initializeTabs();
        });
    }

    async login(password) {
        if (!password) {
            this.showError('Please enter a password');
            return;
        }

        try {
            this.password = password;
            await this.loadKeys();
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('mainScreen').classList.remove('hidden');
            this.showNotification('Successfully logged in!');
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed: ' + error.message);
        }
    }

    initializeButtons() {
        const generateKeyBtn = document.getElementById('generateKey');
        if (generateKeyBtn) {
            generateKeyBtn.addEventListener('click', () => this.generateNewKey());
        }

        const importKeyBtn = document.getElementById('importKey');
        if (importKeyBtn) {
            importKeyBtn.addEventListener('click', () => this.showImportModal());
        }

        const signMessageBtn = document.getElementById('signMessage');
        if (signMessageBtn) {
            signMessageBtn.addEventListener('click', () => this.signMessage());
        }
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));

        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Panel`).classList.remove('hidden');

        if (tabName === 'history') {
            this.loadHistory();
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!');
        } catch (err) {
            this.showError('Failed to copy to clipboard');
        }
    }

    async copyPublicKey(index) {
        const key = this.keys[index];
        await this.copyToClipboard(key.publicKey);
        this.showNotification('Public key copied to clipboard');
    }

    async copyPrivateKey(index) {
        const key = this.keys[index];
        let privateKey = key.privateKey;
        
        if (key.isEncrypted) {
            privateKey = MACICrypto.decryptPrivateKey(key.privateKey, this.password, key.salt);
        }
        
        await this.copyToClipboard(privateKey);
        this.showNotification('Private key copied to clipboard');
    }

    async copyAddress(index) {
        const key = this.keys[index];
        await this.copyToClipboard(key.address);
    }

    showImportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Import Key</h3>
                <div class="form-group">
                    <input type="text" id="importPrivateKey" placeholder="Enter Private Key" class="input" />
                    <button id="confirmImport" class="button primary">Import</button>
                    <button id="cancelImport" class="button secondary">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmImport').addEventListener('click', async () => {
            const privateKey = document.getElementById('importPrivateKey').value;
            try {
                const { publicKey } = await MACICrypto.generateKeypairFromPrivateKey(privateKey);
                const newKey = {
                    publicKey,
                    privateKey,
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    keyType: 'EdDSA',
                    purpose: 'A-MACI Voting'
                };
                
                this.keys.push(newKey);
                await chrome.storage.local.set({ keys: this.keys });
                this.updateKeysList();
                this.updateKeySelector();
                this.showNotification('Key imported successfully!');
                modal.remove();
            } catch (error) {
                this.showError('Invalid private key');
            }
        });

        document.getElementById('cancelImport').addEventListener('click', () => {
            modal.remove();
        });
    }

    async exportKeys() {
        const exportData = {
            keys: this.keys,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maci-keys-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Keys exported successfully!');
    }

    async generateNewKey() {
        try {
            const { privateKey, publicKey, keyType } = await MACICrypto.generateKeypair();
            
            const newKey = {
                publicKey,
                privateKey,
                createdAt: new Date().toISOString(),
                status: 'active',
                keyType,
                purpose: 'A-MACI Voting'
            };
            
            if (this.password) {
                const { encryptedKey, salt } = MACICrypto.encryptPrivateKey(privateKey, this.password);
                newKey.privateKey = encryptedKey;
                newKey.salt = salt;
                newKey.isEncrypted = true;
            }
            
            this.keys.push(newKey);
            await chrome.storage.local.set({ keys: this.keys });
            
            this.updateKeysList();
            this.updateKeySelector();
            this.showNotification('New A-MACI keypair generated successfully!');
            
        } catch (error) {
            console.error('Error generating key:', error);
            this.showError('Error generating keypair: ' + error.message);
        }
    }

    async signMessage() {
        const selectedKeyIndex = document.getElementById('selectedKey').value;
        const message = document.getElementById('messageToSign').value;

        if (!selectedKeyIndex || !message) {
            this.showError('Please select a key and enter a message');
            return;
        }

        try {
            const key = this.keys[selectedKeyIndex];
            let privateKey = key.privateKey;

            if (key.isEncrypted) {
                privateKey = MACICrypto.decryptPrivateKey(key.privateKey, this.password, key.salt);
            }

            const signature = await MACICrypto.signMessage(message, privateKey);

            const resultBox = document.getElementById('signatureResult');
            resultBox.classList.remove('hidden');
            resultBox.innerHTML = `
                <div class="signature-container">
                    <h4>MACI Message Signature</h4>
                    <div class="signature-details">
                        <div class="signature-row">
                            <span class="signature-label">Message:</span>
                            <span class="signature-value">${message}</span>
                        </div>
                        <div class="signature-row">
                            <span class="signature-label">Signature:</span>
                            <span class="signature-value">${this.truncateKey(signature)}</span>
                            <button class="icon-button" onclick="navigator.clipboard.writeText('${signature}')">
                                <span class="material-icons">content_copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            await this.saveToHistory({
                type: 'sign',
                message,
                signature,
                timestamp: new Date().toISOString(),
                keyUsed: this.truncateKey(key.publicKey)
            });
        } catch (error) {
            this.showError('Error signing message: ' + error.message);
        }
    }

    async loadKeys() {
        try {
            const result = await chrome.storage.local.get('keys');
            this.keys = result.keys || [];
            this.updateKeysList();
            this.updateKeySelector();
        } catch (error) {
            console.error('Error loading keys:', error);
            this.showError('Failed to load keys');
        }
    }

    updateKeysList() {
        const keysList = document.getElementById('keysList');
        if (!keysList) return;
        
        keysList.innerHTML = this.keys.map((key, index) => `
            <div class="key-item ${key.status === 'active' ? 'active' : 'inactive'}">
                <div class="key-header">
                    <div class="key-title">
                        <strong>Key ${index + 1}</strong>
                        <span class="key-badge ${key.status}">${key.status}</span>
                        <span class="key-type">${key.keyType || 'EdDSA'}</span>
                    </div>
                    <div class="key-actions">
                        <button class="icon-button" onclick="window.keyManager.copyPublicKey(${index})" title="Copy Public Key">
                            <span class="material-icons">content_copy</span>
                        </button>
                        <button class="icon-button" onclick="window.keyManager.copyPrivateKey(${index})" title="Copy Private Key">
                            <span class="material-icons">vpn_key</span>
                        </button>
                        <button class="icon-button toggle-btn" data-index="${index}" title="${key.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <span class="material-icons">
                                ${key.status === 'active' ? 'toggle_on' : 'toggle_off'}
                            </span>
                        </button>
                        <button class="icon-button warning" onclick="window.keyManager.deleteKey(${index})" title="Delete Key">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="key-details">
                    <div class="key-row">
                        <span class="key-label">Public Key:</span>
                        <span class="key-value" title="${key.publicKey}">${this.truncateKey(key.publicKey)}</span>
                    </div>
                    <div class="key-row">
                        <span class="key-label">Private Key:</span>
                        <span class="key-value" title="${key.privateKey}">${this.truncateKey(key.privateKey)}</span>
                    </div>
                    <div class="key-row">
                        <span class="key-label">Created:</span>
                        <span class="key-value">${new Date(key.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="key-row">
                        <span class="key-label">Purpose:</span>
                        <span class="key-value">${key.purpose}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for toggle buttons
        keysList.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.toggleKeyStatus(index);
            });
        });
    }

    async toggleKeyStatus(index) {
        try {
            const key = this.keys[index];
            if (!key) {
                throw new Error('Key not found');
            }

            // Toggle the status
            key.status = key.status === 'active' ? 'inactive' : 'active';
            
            // Save to storage
            await chrome.storage.local.set({ keys: this.keys });
            
            // Update UI
            this.updateKeysList();
            
            // Show notification
            this.showNotification(`Key ${key.status === 'active' ? 'activated' : 'deactivated'} successfully`);
            
            // Save to history
            await this.saveToHistory({
                type: 'status_change',
                keyUsed: this.truncateKey(key.publicKey),
                message: `Key ${key.status === 'active' ? 'activated' : 'deactivated'}`,
                timestamp: new Date().toISOString()
            });

            // Update key selector if we're in signing mode
            this.updateKeySelector();
        } catch (error) {
            console.error('Error toggling key status:', error);
            this.showError('Failed to toggle key status: ' + error.message);
        }
    }

    updateKeySelector() {
        const selector = document.getElementById('selectedKey');
        if (!selector) return;

        // Only show active keys in the selector
        const activeKeys = this.keys.filter(key => key.status === 'active');
        
        selector.innerHTML = `
            <option value="">Select Key</option>
            ${activeKeys.map((key, index) => `
                <option value="${index}">Key ${index + 1} - ${this.truncateKey(key.publicKey)}</option>
            `).join('')}
        `;
    }

    async saveToHistory(transaction) {
        try {
            this.history.unshift(transaction);
            this.history = this.history.slice(0, 50);
            await chrome.storage.local.set({ history: this.history });
            this.updateHistoryList();
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get('history');
            this.history = result.history || [];
            this.updateHistoryList();
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    updateHistoryList() {
        const historyList = document.getElementById('transactionsList');
        if (!historyList) return;

        historyList.innerHTML = this.history.map(tx => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-type ${tx.type}">${tx.type.toUpperCase()}</span>
                    <span class="history-date">${new Date(tx.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-details">
                    ${tx.type === 'sign' ? `
                        <div class="history-row">
                            <span class="history-label">Message:</span>
                            <span class="history-value">${tx.message}</span>
                        </div>
                        <div class="history-row">
                            <span class="history-label">Signature:</span>
                            <span class="history-value">${this.truncateKey(tx.signature)}</span>
                        </div>
                    ` : ''}
                    <div class="history-row">
                        <span class="history-label">Key Used:</span>
                        <span class="history-value">${tx.keyUsed}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        chrome.storage.local.set({ theme: isDark ? 'light' : 'dark' });
        
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }

    async loadTheme() {
        const result = await chrome.storage.local.get('theme');
        if (result.theme) {
            document.body.setAttribute('data-theme', result.theme);
            const themeIcon = document.querySelector('.theme-icon');
            themeIcon.textContent = result.theme === 'dark' ? '☀️' : '🌙';
        }
    }

    truncateKey(key) {
        if (!key) return '';
        return key.substring(0, 10) + '...' + key.substring(key.length - 8);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Make keyManager globally accessible
window.keyManager = new MAICKeyManager();
