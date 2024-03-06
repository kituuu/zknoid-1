import { Field, Group, PrivateKey, PublicKey } from 'o1js';

// Check if it is ok
export const convertToMesage = (v: number): [Group, Group] => {
    return [Group.generator.scale(v), Group.generator];
};

/*
    g - generator
    pk - public key for encryption
    m - value to encrypt
    r - random value
*/
export const encrypt = (
    // g: Group, g = Group.generator
    pk: PublicKey,
    m: [Group, Group, Group],
    r: Field
): [Group, Group, Group] => {
    let m0Add = Group.generator.scale(+r.toString());
    let m1Add = pk.toGroup().scale(+r.toString());

    let newM: [Group, Group, Group] = [
        m0Add.add(m[0]), // TODO How to scale fields?
        m1Add.add(m[1]),
        Group.zero,
    ];
    return newM;
};

// Value = m[1] - m[2]
export const decrypt = (
    sk: PrivateKey,
    m: [Group, Group, Group]
): [Group, Group, Group] => {
    let newM: [Group, Group, Group] = [m[0], m[1], m[2].add(m[0].scale(sk.s))];
    return newM;
};
