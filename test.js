const asyncFunction = async function (proiseOrObject) {
    console.log('proiseOrObject', proiseOrObject);
    return proiseOrObject;
}

const main = async () => {
    const data = await asyncFunction(

        new Promise(
            function (resolve, reject) {
                console.log('promise');
                return resolve('1');
            })

    );
    console.log('data', data);
}

main();