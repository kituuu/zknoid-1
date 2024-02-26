import { Field, Group, PrivateKey, PublicKey } from 'o1js';

/*
    g - generator
    pk - public key for encryption
    m - value to encrypt
    r - random value
*/
export const encrypt = (
    // g: Group, g = Group.generator
    pk: PublicKey,
    m: [Group, Group],
    r: Field
): [Group, Group] => {
    // Totaly not sequire, but ok for first tests
    let newM: [Group, Group] = [m[0].add(pk.toGroup()), m[1].add(pk.toGroup())];
    // Todo. For now no encryption executed
    return newM;
};

export const decrypt = (sk: PrivateKey, m: [Group, Group]): [Group, Group] => {
    let pk = sk.toPublicKey();

    let newM: [Group, Group] = [m[0].sub(pk.toGroup()), m[1].sub(pk.toGroup())];
    // Todo. For now no decryption executed
    return newM;
};
