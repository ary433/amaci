import { genRandomSalt, hash5, hashLeftRight, NOTHING_UP_MY_SLEEVE } from 'maci-crypto'
import { genPrivKey, genPubKey } from 'maci-crypto'
import { stringifyBigInts } from 'maci-crypto'

class MACICrypto {
    static async generateKeypair() {
        // Generate a random private key
        const privateKey = genPrivKey()
        
        // Generate the corresponding public key
        const publicKey = genPubKey(privateKey)

        return {
            privateKey: stringifyBigInts(privateKey),
            publicKey: stringifyBigInts(publicKey)
        }
    }

    static async signMessage(message, privateKey) {
        // Hash the message first
        const messageHash = hash5([
            BigInt(message),
            NOTHING_UP_MY_SLEEVE,
            BigInt(0),
            BigInt(0),
            BigInt(0)
        ])

        // Sign the hash with the private key
        const signature = hashLeftRight(messageHash, BigInt(privateKey))

        return stringifyBigInts(signature)
    }

    static async verifySignature(message, signature, publicKey) {
        // Hash the message
        const messageHash = hash5([
            BigInt(message),
            NOTHING_UP_MY_SLEEVE,
            BigInt(0),
            BigInt(0),
            BigInt(0)
        ])

        // Verify the signature
        const computedPubKey = genPubKey(signature)
        return computedPubKey === publicKey
    }

    static encryptPrivateKey(privateKey, password) {
        const salt = genRandomSalt()
        const key = hash5([
            BigInt(password),
            BigInt(salt),
            NOTHING_UP_MY_SLEEVE,
            BigInt(0),
            BigInt(0)
        ])
        
        return {
            encryptedKey: stringifyBigInts(hashLeftRight(BigInt(privateKey), key)),
            salt: stringifyBigInts(salt)
        }
    }

    static decryptPrivateKey(encryptedKey, password, salt) {
        const key = hash5([
            BigInt(password),
            BigInt(salt),
            NOTHING_UP_MY_SLEEVE,
            BigInt(0),
            BigInt(0)
        ])
        
        return stringifyBigInts(hashLeftRight(BigInt(encryptedKey), key))
    }
}

export default MACICrypto;
