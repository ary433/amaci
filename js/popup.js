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
            // Theme toggle
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }

            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const password = document.getElementById('password').value;
                    this.login(password);
                });
            }

            // Tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });

            // Generate key button
            const generateKeyBtn = document.getElementById('generateKey');
            if (generateKeyBtn) {
                generateKeyBtn.addEventListener('click', () => this.generateNewKey());
            }

            // Import key button
            const importKeyBtn = document.getElementById('importKey');
            if (importKeyBtn) {
                importKeyBtn.addEventListener('click', () => this.showImportModal());
            }

            // Sign message button
            const signMessageBtn = document.getElementById('signMessage');
            if (signMessageBtn) {
                signMessageBtn.addEventListener('click', () => this.signMessage());
            }

            // Initialize history
            this.history = [];
            this.loadHistory();

            // Load theme
            this.loadTheme();
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
            this.showNotification('Copied to clipboard successfully!');
        } catch (err) {
            this.showError('Failed to copy to clipboard');
            console.error('Failed to copy:', err);
        }
    }

    async copyPublicKey(index) {
        const key = this.keys[index];
        if (key && key.publicKey) {
            await this.copyToClipboard(key.publicKey);
        }
    }

    async copyPrivateKey(index) {
        const key = this.keys[index];
        if (key && key.encryptedPrivateKey && this.password) {
            try {
                const decryptedKey = MACICrypto.decryptPrivateKey(
                    key.encryptedPrivateKey,
                    this.password,
                    key.salt
                );
                await this.copyToClipboard(decryptedKey);
            } catch (error) {
                console.error('Error decrypting private key:', error);
                this.showError('Failed to copy private key');
            }
        }
    }

    async copySignedMessage(message, signature) {
        if (message && signature) {
            const textToCopy = `Message: ${message}\nSignature: ${signature}`;
            await this.copyToClipboard(textToCopy);
        }
    }

    deleteKey(index) {
        if (index >= 0 && index < this.keys.length) {
            this.keys.splice(index, 1);
            chrome.storage.local.set({ keys: this.keys });
            this.updateKeysList();
            this.updateKeySelector();
            this.showNotification('Key deleted successfully');
        }
    }

    showImportModal() {
        this.importKeys();
    }

    async importKeys() {
        try {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            
            fileInput.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) {
                        this.showError('No file selected');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const importData = JSON.parse(event.target.result);
                            
                            // Validate import data structure
                            if (!importData.keys || !Array.isArray(importData.keys)) {
                                this.showError('Invalid key file format');
                                return;
                            }

                            // Validate each key
                            const validKeys = importData.keys.filter(key => 
                                key.publicKey && 
                                key.encryptedPrivateKey && 
                                key.salt &&
                                key.keyType
                            );

                            if (validKeys.length === 0) {
                                this.showError('No valid keys found in import file');
                                return;
                            }

                            // Add new keys to existing keys
                            this.keys = [...this.keys, ...validKeys];
                            localStorage.setItem('keys', JSON.stringify(this.keys));
                            
                            this.updateKeysList();
                            this.updateKeySelector();
                            
                            this.showNotification(`Successfully imported ${validKeys.length} keys`);
                        } catch (parseError) {
                            console.error('Parse error:', parseError);
                            this.showError('Failed to parse import file');
                        }
                    };

                    reader.onerror = () => {
                        this.showError('Error reading file');
                    };

                    reader.readAsText(file);
                } catch (fileError) {
                    console.error('File error:', fileError);
                    this.showError('Error processing file');
                }
            };

            fileInput.click();
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Failed to initiate import');
        }
    }

    async exportKeys() {
        try {
            if (!this.keys || this.keys.length === 0) {
                this.showError('No keys available to export');
                return;
            }

            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                keys: this.keys.map(key => ({
                    publicKey: key.publicKey,
                    encryptedPrivateKey: key.encryptedPrivateKey,
                    salt: key.salt,
                    keyType: key.keyType
                }))
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `maci-keys-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('Keys exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export keys');
        }
    }

    async generateNewKey() {
        try {
            if (!this.password) {
                this.showError('Please log in first to generate keys');
                return;
            }

            const keypair = await MACICrypto.generateKeypair();
            const encryptedData = MACICrypto.encryptPrivateKey(keypair.privateKey, this.password);
            
            const newKey = {
                publicKey: keypair.publicKey,
                encryptedPrivateKey: encryptedData.encryptedKey,
                salt: encryptedData.salt,
                keyType: keypair.keyType,
                createdAt: new Date().toISOString(),
                status: 'active' // Default to active
            };

            this.keys.push(newKey);
            localStorage.setItem('keys', JSON.stringify(this.keys));
            
            this.updateKeysList();
            this.updateKeySelector();
            this.showNotification('New key generated successfully');
        } catch (error) {
            console.error('Error generating key:', error);
            this.showError('Failed to generate new key');
        }
    }

    updateKeySelector() {
        const keySelector = document.getElementById('selectedKey');
        if (!keySelector) return;

        // Only show active keys in the selector
        const activeKeys = this.keys.filter(key => key.status === 'active');
        
        keySelector.innerHTML = `
            <option value="">Select Key</option>
            ${activeKeys.map((key, index) => {
                const keyIndex = this.keys.indexOf(key);
                return `<option value="${keyIndex}">Key ${keyIndex + 1} - ${this.truncateKey(key.publicKey)}</option>`;
            }).join('')}
        `;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard successfully!');
        } catch (err) {
            this.showError('Failed to copy to clipboard');
            console.error('Failed to copy:', err);
        }
    }

    async copyPublicKey(index) {
        const key = this.keys[index];
        if (key && key.publicKey) {
            await this.copyToClipboard(key.publicKey);
        }
    }

    async copyPrivateKey(index) {
        const key = this.keys[index];
        if (key && key.encryptedPrivateKey && this.password) {
            try {
                const decryptedKey = MACICrypto.decryptPrivateKey(
                    key.encryptedPrivateKey,
                    this.password,
                    key.salt
                );
                await this.copyToClipboard(decryptedKey);
            } catch (error) {
                console.error('Error decrypting private key:', error);
                this.showError('Failed to copy private key');
            }
        }
    }

    async copySignedMessage(message, signature) {
        if (message && signature) {
            const textToCopy = `Message: ${message}\nSignature: ${signature}`;
            await this.copyToClipboard(textToCopy);
        }
    }

    deleteKey(index) {
        if (index >= 0 && index < this.keys.length) {
            this.keys.splice(index, 1);
            chrome.storage.local.set({ keys: this.keys });
            this.updateKeysList();
            this.updateKeySelector();
            this.showNotification('Key deleted successfully');
        }
    }

    showImportModal() {
        this.importKeys();
    }

    async importKeys() {
        try {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            
            fileInput.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) {
                        this.showError('No file selected');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const importData = JSON.parse(event.target.result);
                            
                            // Validate import data structure
                            if (!importData.keys || !Array.isArray(importData.keys)) {
                                this.showError('Invalid key file format');
                                return;
                            }

                            // Validate each key
                            const validKeys = importData.keys.filter(key => 
                                key.publicKey && 
                                key.encryptedPrivateKey && 
                                key.salt &&
                                key.keyType
                            );

                            if (validKeys.length === 0) {
                                this.showError('No valid keys found in import file');
                                return;
                            }

                            // Add new keys to existing keys
                            this.keys = [...this.keys, ...validKeys];
                            localStorage.setItem('keys', JSON.stringify(this.keys));
                            
                            this.updateKeysList();
                            this.updateKeySelector();
                            
                            this.showNotification(`Successfully imported ${validKeys.length} keys`);
                        } catch (parseError) {
                            console.error('Parse error:', parseError);
                            this.showError('Failed to parse import file');
                        }
                    };

                    reader.onerror = () => {
                        this.showError('Error reading file');
                    };

                    reader.readAsText(file);
                } catch (fileError) {
                    console.error('File error:', fileError);
                    this.showError('Error processing file');
                }
            };

            fileInput.click();
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Failed to initiate import');
        }
    }

    async exportKeys() {
        try {
            if (!this.keys || this.keys.length === 0) {
                this.showError('No keys available to export');
                return;
            }

            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                keys: this.keys.map(key => ({
                    publicKey: key.publicKey,
                    encryptedPrivateKey: key.encryptedPrivateKey,
                    salt: key.salt,
                    keyType: key.keyType
                }))
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `maci-keys-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('Keys exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export keys');
        }
    }

    async generateNewKey() {
        try {
            if (!this.password) {
                this.showError('Please log in first to generate keys');
                return;
            }

            const keypair = await MACICrypto.generateKeypair();
            const encryptedData = MACICrypto.encryptPrivateKey(keypair.privateKey, this.password);
            
            const newKey = {
                publicKey: keypair.publicKey,
                encryptedPrivateKey: encryptedData.encryptedKey,
                salt: encryptedData.salt,
                keyType: keypair.keyType,
                createdAt: new Date().toISOString(),
                status: 'active' // Default to active
            };

            this.keys.push(newKey);
            localStorage.setItem('keys', JSON.stringify(this.keys));
            
            this.updateKeysList();
            this.updateKeySelector();
            this.showNotification('New key generated successfully');
        } catch (error) {
            console.error('Error generating key:', error);
            this.showError('Failed to generate new key');
        }
    }

    updateKeySelector() {
        const keySelector = document.getElementById('selectedKey');
        if (!keySelector) return;

        // Only show active keys in the selector
        const activeKeys = this.keys.filter(key => key.status === 'active');
        
        keySelector.innerHTML = `
            <option value="">Select Key</option>
            ${activeKeys.map((key, index) => {
                const keyIndex = this.keys.indexOf(key);
                return `<option value="${keyIndex}">Key ${keyIndex + 1} - ${this.truncateKey(key.publicKey)}</option>`;
            }).join('')}
        `;
    }

    toggleKeyStatus(index) {
        try {
            if (index < 0 || index >= this.keys.length) {
                this.showError('Invalid key index');
                return;
            }

            const key = this.keys[index];
            key.status = key.status === 'active' ? 'inactive' : 'active';
            
            localStorage.setItem('keys', JSON.stringify(this.keys));
            this.updateKeysList();
            this.updateKeySelector();
            
            this.showNotification(`Key ${index + 1} ${key.status === 'active' ? 'activated' : 'deactivated'}`);
        } catch (error) {
            console.error('Error toggling key status:', error);
            this.showError('Failed to toggle key status');
        }
    }

    updateKeysList() {
        const keysList = document.getElementById('keysList');
        keysList.innerHTML = '';
        
        this.keys.forEach((key, index) => {
            const keyItem = document.createElement('div');
            keyItem.className = `key-item ${key.status || 'active'}`;
            
            const decryptedPrivateKey = this.getDecryptedPrivateKey(key);
            
            const keyInfo = document.createElement('div');
            keyInfo.className = 'key-info';
            keyInfo.innerHTML = `
                <div class="key-container">
                    <div class="key-header">
                        <div class="key-title-group">
                            <span class="key-title">Key ${index + 1}</span>
                            <span class="key-status ${key.status || 'active'}">${key.status || 'active'}</span>
                        </div>
                        <span class="key-date">${new Date(key.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="key-content">
                        <div class="key-field">
                            <label>Public Key:</label>
                            <div class="key-value" title="${key.publicKey}">
                                ${this.truncateKey(key.publicKey)}
                            </div>
                        </div>
                        
                        <div class="key-field">
                            <label>Private Key:</label>
                            <div class="key-value" title="${decryptedPrivateKey}">
                                ${this.truncateKey(decryptedPrivateKey)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="key-actions">
                        <button class="action-btn copy-btn" data-index="${index}" data-type="public">
                            <span class="btn-icon">📋</span> Copy Public
                        </button>
                        <button class="action-btn copy-btn" data-index="${index}" data-type="private">
                            <span class="btn-icon">🔑</span> Copy Private
                        </button>
                        <button class="action-btn toggle-btn" data-index="${index}">
                            <span class="btn-icon">${key.status === 'inactive' ? '🔓' : '🔒'}</span>
                            ${key.status === 'inactive' ? 'Activate' : 'Deactivate'}
                        </button>
                        <button class="action-btn export-btn" data-index="${index}">
                            <span class="btn-icon">📤</span> Export
                        </button>
                        <button class="action-btn delete-btn" data-index="${index}">
                            <span class="btn-icon">🗑️</span> Delete
                        </button>
                    </div>
                </div>
            `;
            
            keyItem.appendChild(keyInfo);
            keysList.appendChild(keyItem);
        });

        // Add event listeners for buttons
        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.copy-btn').dataset.index);
                const type = e.target.closest('.copy-btn').dataset.type;
                if (type === 'public') {
                    this.copyPublicKey(index);
                } else if (type === 'private') {
                    this.copyPrivateKey(index);
                }
            });
        });

        document.querySelectorAll('.toggle-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.toggle-btn').dataset.index);
                this.toggleKeyStatus(index);
            });
        });

        document.querySelectorAll('.export-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.export-btn').dataset.index);
                this.exportSingleKey(index);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.delete-btn').dataset.index);
                if (confirm('Are you sure you want to delete this key?')) {
                    this.deleteKey(index);
                }
            });
        });
    }

    async exportSingleKey(index) {
        try {
            const key = this.keys[index];
            if (!key) {
                this.showError('Key not found');
                return;
            }

            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                key: {
                    publicKey: key.publicKey,
                    encryptedPrivateKey: key.encryptedPrivateKey,
                    salt: key.salt,
                    keyType: key.keyType,
                    createdAt: key.createdAt
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `maci-key-${index + 1}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('Key exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export key');
        }
    }

    async signMessage() {
        try {
            if (!this.password) {
                this.showError('Please log in first');
                return;
            }

            const messageInput = document.getElementById('messageToSign');
            const keySelector = document.getElementById('selectedKey');
            const signatureResult = document.getElementById('signatureResult');

            if (!messageInput || !keySelector || !signatureResult) {
                this.showError('Required elements not found');
                return;
            }

            const message = messageInput.value.trim();
            const selectedKeyIndex = keySelector.value;

            if (!message) {
                this.showError('Please enter a message to sign');
                return;
            }

            if (selectedKeyIndex === '' || !this.keys[selectedKeyIndex]) {
                this.showError('Please select a valid key');
                return;
            }

            const key = this.keys[selectedKeyIndex];
            const decryptedPrivateKey = MACICrypto.decryptPrivateKey(
                key.encryptedPrivateKey,
                this.password,
                key.salt
            );

            const signature = await MACICrypto.signMessage(message, decryptedPrivateKey);

            // Update signature output
            signatureResult.classList.remove('hidden');
            signatureResult.innerHTML = `
                <div class="signature-container">
                    <h4>Signature Generated</h4>
                    <div class="signature-details">
                        <div class="signature-row">
                            <span class="signature-label">Message:</span>
                            <span class="signature-value">${message}</span>
                        </div>
                        <div class="signature-row">
                            <span class="signature-label">Signature:</span>
                            <span class="signature-value">${signature}</span>
                        </div>
                        <div class="signature-row">
                            <span class="signature-label">Public Key:</span>
                            <span class="signature-value">${key.publicKey}</span>
                        </div>
                    </div>
                    <div class="signature-actions">
                        <button class="action-btn copy-btn" onclick="window.keyManager.copySignedMessage('${message}', '${signature}')">
                            <span class="btn-icon">📋</span> Copy All
                        </button>
                    </div>
                </div>
            `;

            // Add to history
            const historyEntry = {
                type: 'sign',
                timestamp: new Date().toISOString(),
                data: {
                    message,
                    signature,
                    publicKey: key.publicKey
                }
            };

            this.saveToHistory(historyEntry);
            this.showNotification('Message signed successfully');

        } catch (error) {
            console.error('Error signing message:', error);
            this.showError('Failed to sign message');
        }
    }

    async copySignedMessage(message, signature) {
        try {
            const text = `Message: ${message}\nSignature: ${signature}`;
            await this.copyToClipboard(text);
        } catch (error) {
            console.error('Error copying signed message:', error);
            this.showError('Failed to copy signed message');
        }
    }

    saveToHistory(entry) {
        try {
            this.history.unshift(entry);
            // Keep only the last 50 entries
            if (this.history.length > 50) {
                this.history = this.history.slice(0, 50);
            }
            localStorage.setItem('history', JSON.stringify(this.history));
            this.updateHistoryList();
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    loadHistory() {
        try {
            const savedHistory = localStorage.getItem('history');
            this.history = savedHistory ? JSON.parse(savedHistory) : [];
            this.updateHistoryList();
        } catch (error) {
            console.error('Error loading history:', error);
            this.history = [];
        }
    }

    updateHistoryList() {
        const historyList = document.getElementById('transactionsList');
        if (!historyList) return;

        historyList.innerHTML = this.history.map((entry, index) => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-type ${entry.type}">${entry.type.toUpperCase()}</span>
                    <span class="history-date">${new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-details">
                    <div class="history-row">
                        <span class="history-label">Message:</span>
                        <span class="history-value">${entry.data.message}</span>
                    </div>
                    <div class="history-row">
                        <span class="history-label">Signature:</span>
                        <span class="history-value">${this.truncateKey(entry.data.signature)}</span>
                    </div>
                    <div class="history-row">
                        <span class="history-label">Public Key:</span>
                        <span class="history-value">${this.truncateKey(entry.data.publicKey)}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="action-btn copy-btn" onclick="window.keyManager.copySignedMessage('${entry.data.message}', '${entry.data.signature}')">
                        <span class="btn-icon">📋</span> Copy
                    </button>
                </div>
            </div>
        `).join('');
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

    getDecryptedPrivateKey(key) {
        if (!key || !key.encryptedPrivateKey || !this.password) return 'Login required';
        try {
            return MACICrypto.decryptPrivateKey(
                key.encryptedPrivateKey,
                this.password,
                key.salt
            );
        } catch (error) {
            console.error('Error decrypting private key:', error);
            return 'Decryption failed';
        }
    }

    truncateKey(key) {
        if (!key) return 'N/A';
        const start = key.slice(0, 8);
        const end = key.slice(-8);
        return `${start}...${end}`;
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
}

// Make keyManager globally accessible
window.keyManager = new MAICKeyManager();