# Amaci Key Manager

## Table of Contents
- [Overview](#overview)
- [What is Amaci?](#what-is-amaci)
- [Features](#features)
  - [EdDSA Key Management](#eddsa-key-management)
  - [Security](#security)
  - [Message Signing](#message-signing)
  - [User Interface](#user-interface)
- [Installation](#installation)
  - [From GitHub Repository](#from-github-repository)
  - [Manual Installation](#manual-installation)
- [Usage Guide](#usage-guide)
  - [Initial Setup](#initial-setup)
  - [Key Management](#key-management)
  - [Signing Messages](#signing-messages)
  - [Security Best Practices](#security-best-practices)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Acknowledgments](#acknowledgments)

## Overview

Amaci Key Manager is a browser extension designed specifically for managing EdDSA keypairs used in Amaci (Anonymous Minimal Anti-Collusion Infrastructure) voting systems. This tool provides a secure and user-friendly interface for generating, managing, and using cryptographic keys essential for participating in anonymous voting and decentralized governance.

## What is Amaci?

Amaci is Dora Factory's solution for scalable, private, and collusion-resistant decentralized governance. Key features:

- Based on Zk-SNARK/PLONK for privacy protection
- Prevents public visibility of voting details
- Ensures credible voting results without revealing individual votes
- Prevents voter collusion through anonymity
- Provides trustless voting mechanism without administrator visibility
- Enables anyone to become an Amaci operator

## Features

- **EdDSA Key Management**
  - Generate cryptographically secure EdDSA keypairs
  - View and copy both public and private keys
  - Toggle key status (active/inactive)
  - Securely store multiple keypairs
  - Import existing keys
  - Export keys for backup

- **Security**
  - Password-protected access
  - Encrypted storage of private keys
  - Secure clipboard operations
  - No external data transmission
  - Auto-lock for security

- **Message Signing**
  - Sign messages for Amaci voting
  - View and verify signatures
  - Track signing history

- **User Interface**
  - Clean, intuitive interface
  - Dark/Light mode support
  - Clear key status indicators
  - One-click copy functionality
  - Transaction history

## Installation

### From GitHub Repository

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ary433/amaci.git
   cd amaci-key-manager
   ```

2. **Load in Chrome/Edge**
   - Open Chrome/Edge browser
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `amaci-key-manager` directory you cloned

### Manual Installation

1. **Download the Code**
   - Download the ZIP from GitHub
   - Extract to a local directory

2. **Load in Browser**
   - Follow the same steps as above for loading in Chrome/Edge

## Usage Guide

### Initial Setup

1. **First Launch**
   - Click the Amaci Key Manager icon in your browser toolbar
   - Set a strong password for securing your keys
   - This password will be required each time you access your keys

2. **Generate Your First Key**
   - Click "Generate New Key"
   - Your EdDSA keypair will be generated securely
   - The public and private keys will be displayed
   - The key will be automatically stored in encrypted form

### Key Management

1. **Viewing Keys**
   - All your keys are listed in the main interface
   - Each key shows:
     - Public key (safe to share)
     - Private key (keep secret!)
     - Creation date
     - Current status

2. **Key Actions**
   - Copy public key: Click the copy icon next to the public key
   - Copy private key: Click the key icon next to the private key
   - Toggle status: Click the toggle switch to activate/deactivate
   - Delete key: Click the trash icon (requires confirmation)

3. **Importing Keys**
   - Click "Import Key"
   - Enter your existing private key
   - The corresponding public key will be derived
   - The keypair will be stored securely

4. **Exporting Keys**
   - Click "Export Keys"
   - Your keys will be exported in a secure format
   - Store the backup safely

### Signing Messages

1. **Select Key**
   - Go to the "Sign" tab
   - Choose an active key from the dropdown

2. **Sign Message**
   - Enter the message to sign
   - Click "Sign Message"
   - The signature will be displayed
   - Copy the signature for use in Amaci voting

### Security Best Practices

1. **Password Security**
   - Use a strong, unique password
   - Never share your password
   - Change password periodically

2. **Key Management**
   - Keep private keys secret
   - Backup keys securely
   - Deactivate unused keys
   - Delete compromised keys immediately

3. **General Security**
   - Keep your browser updated
   - Only install from trusted sources
   - Lock your computer when away
   - Regular security audits

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Submit a pull request
- Contact: himanshusugha@gmail.com

## Acknowledgments

This project was developed for the Dora Factory Hackathon to support anonymous voting in decentralized governance systems.
