const { networks } = require("../networks")
const fs = require("fs")
const { generateOffchainSecrets } = require("../tasks/utils/generateOffchainSecrets")
const { createGist, deleteGist } = require("../tasks/utils/github");
const encryptSecrets_1 = require("../FunctionsSandboxLibrary/encryptSecrets")
const { ethers } = require("ethers")
const functionOracleAbi = require("./abis/functionsOracleAbi");
const dotenv = require("dotenv").config();
const path = require("path")

const getNetwork = (networkName) => {
    if (networkName === "polygonMumbai") {
        return {network: networks.polygonMumbai, rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL};
    } else if (networkName === "ethTestnet") {
        return {network: networks.ethereumSepolia, rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL};
    } else if (networkName === "avalancheFuji") {
        return {network: networks.avalancheFuji, rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL};
    } else {
        throw new Error("Invalid network provided");
    }
}

const generateSecrete = async (requestConfig, networkName) => {
    let secreteUrl = [];

    const {network, rpcUrl} = getNetwork(networkName);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY)
    const signer = wallet.connect(provider);

    const oracleContract = new ethers.Contract(network.functionsOracleProxy, functionOracleAbi, provider);
    const [nodeAddresses, perNodePublicKeys] = await oracleContract.getAllNodePublicKeys()
    const DONPublicKey = await oracleContract.getDONPublicKey();

    const offchainSecrets = await generateOffchainSecrets(
        requestConfig,
        process.env.PRIVATE_KEY,
        DONPublicKey,
        nodeAddresses,
        perNodePublicKeys
    )

    const secretUrl = await createGist(process.env.GITHUB_TOKEN, offchainSecrets);
    secreteUrl.push(secretUrl);
    let secrets = "0x" + (await (0, encryptSecrets_1.encrypt)(DONPublicKey.slice(2), secreteUrl.join(" ")))
    
    return {secrets, secretUrl};
}

const deleteSecrete = async (secretUrl) => {
    const undoGist = await deleteGist(process.env.GITHUB_TOKEN, secretUrl);
    if(!undoGist) throw new Error("Error deleting gist");
    return true;
}

module.exports = {
    generateSecrete,
    deleteSecrete
};

generateSecrete({ secrets: { apiKey: process.env.COINMARKETCAP_API_KEY ?? "" }}, "polygonMumbai").then((res)=> {console.log(res)}).catch()