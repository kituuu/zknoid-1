import { randomInt } from 'crypto';
import { Field, Group, PrivateKey, PublicKey } from 'o1js';
import { decrypt, encrypt } from '../../src/engine/ElGamal';

describe('Horminic encryption test', () => {
    it('Can encrypt/decrypt', () => {
        let sk1 = PrivateKey.random();
        let pk1 = sk1.toPublicKey();

        let sk2 = PrivateKey.random();
        let pk2 = sk2.toPublicKey();

        let collectedPk = PublicKey.fromGroup(pk1.toGroup().add(pk2.toGroup()));

        let initMessage = randomInt(0, 1000);
        let groupMessage = Group.generator.scale(initMessage);
        let encryptedMessage = [Group.zero, groupMessage, Group.zero];
        let random1 = randomInt(1000);
        let random2 = randomInt(1000);

        encryptedMessage = encrypt(
            collectedPk,
            encryptedMessage as [Group, Group, Group],
            Field.from(random1)
        );

        encryptedMessage = encrypt(
            collectedPk,
            encryptedMessage as [Group, Group, Group],
            Field.from(random2)
        );

        encryptedMessage = decrypt(
            sk1,
            encryptedMessage as [Group, Group, Group]
        );

        encryptedMessage = decrypt(
            sk2,
            encryptedMessage as [Group, Group, Group]
        );

        encryptedMessage[1].sub(encryptedMessage[2]).assertEquals(groupMessage);
    });
});
