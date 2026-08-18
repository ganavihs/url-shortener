const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function encodeBase62(number) {
    if (number === 0) {
        return characters[0];
    }

    let result = "";

    while (number > 0) {
        const remainder = number % 62;
        result = characters[remainder] + result;
        number = Math.floor(number / 62);
    }

    return result;
}

module.exports = encodeBase62;

