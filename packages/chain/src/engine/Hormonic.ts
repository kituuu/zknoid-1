import { Field, Group, PrivateKey, PublicKey } from 'o1js';

/*
    g - generator
    pk - public key for encryption
    m - value to encrypt
    r - random value
*/
export const encrypt = (
    g: Group,
    pk: PublicKey,
    m: [Group, Group],
    r: Field
): [Group, Group] => {
    // Todo. For now no encryption executed
    return m;
};

export const decrypt = (sk: PrivateKey, m: [Group, Group]): [Group, Group] => {
    // Todo. For now no decryption executed
    return m;
};
