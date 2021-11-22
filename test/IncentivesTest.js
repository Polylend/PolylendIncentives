const ERC20 = artifacts.require("ERC20");
const IncentivesProof = artifacts.require("IncentivesProof");
const MetaLoanIncentivesController = artifacts.require("MetaLoanIncentivesController");
const BigNumber = require("bignumber.js");


const WAY = new BigNumber("1e+18");

let isInit = true;
let MCoinIncentives;
let MCoin;
let WmaticAtoken;
let WmaticVdtoken;
let MintToken;

// accounts: owner, emission manager, andy, Joan,
let owner;
let emissionManager;
let minter;
let Andy;
let James;
let Joan;

var assets = [];

// mint start timestamp
var mintWmaticAtokenSTime = 0;
var mintMintTokenSTime = 0;
// emission rate
var curWmaticAtokenEmissionRate = 0;
var curMintTokenEmissionRate = 0;
// mint total supply
var g_mintTotalSupply = 0;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function PrintAsset(data, symbol) {
    console.log("Asset=" + symbol + " emission param:");
    console.log(" id=" + data.id);
    console.log(" emissionPerSecond=" + data.emissionPerSecond);
    console.log(" lastUpdateTimestamp=" + data.lastUpdateTimestamp);
    console.log(" index=" + data.index);
    console.log(" ratio=" + data.ratio);
}

async function sleep(delay) {
  var start = (new Date()).getTime();
  console.log(start + "," + delay)
  while ((new Date()).getTime() - start < delay) {
      continue;
  }
}


contract('MCoinIncentivesController', async accounts => {
    beforeEach(async () => {
        if ( isInit == true ) {
            MCoinIncentives = await MetaLoanIncentivesController.deployed();
            var PRECISION = new BigNumber(await MCoinIncentives.DISTRIBUTION_END());
            console.log("PRECISION=" + PRECISION.toNumber());
            console.log(new BigNumber(await MCoinIncentives.getBlockTime()).toNumber());
            owner = accounts[0];
            emissionManager = accounts[1];
            minter = accounts[2];
            Andy = accounts[3];
            James = accounts[4];
            Joan = accounts[5];

            await web3.eth.sendTransaction({from: accounts[6], to: minter, value: '80000000000000000000'});
            console.log("aaaad=" + new BigNumber(await web3.eth.getBalance(minter)).toString());
            MCoin = await ERC20.at('0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0');
            WmaticAtoken = await IncentivesProof.at('0x345cA3e014Aaf5dcA488057592ee47305D9B3e10');
            WmaticVdtoken = await IncentivesProof.at('0x8f0483125FCb9aaAEFA9209D8E9d7b9C8B9Fb90F');
            MintToken = await IncentivesProof.at('0x2C2B9C9a4a25e24B174f26114e8926a9f2128FE4');

            var symbol = await MCoin.symbol();
            console.log('MCoin symbol=' + symbol);
            symbol = await WmaticAtoken.symbol();
            console.log('WmaticAtoken symbol=' + symbol);
            symbol = await WmaticVdtoken.symbol();
            console.log('WmaticVdtoken symbol=' + symbol);
            symbol = await MintToken.symbol();
            console.log('MintToken symbol=' + symbol);

            isInit = false;
            console.log(new BigNumber(await MCoinIncentives.getBlockTime()).toNumber());

            // mint reward
            var mintSupply = web3.utils.toWei('100', 'ether');
            await MCoin.mint(MCoinIncentives.address, mintSupply, {from: owner});

            assets.push(WmaticAtoken.address);
            assets.push(WmaticVdtoken.address);
        }
    });

    it('Config', async() => {
        var AssetConfigInput = [];
        var AssetConfig = [];
        var emissionPerSecond = web3.utils.toWei('0.001', 'ether');   // emissionPerSecond is 0.001 MCoin
        // first input: token address and staked is 0;
        curWmaticAtokenEmissionRate = new BigNumber(emissionPerSecond.toString()).div(WAY);
        AssetConfig.push(emissionPerSecond);
        AssetConfig.push(0);
        AssetConfig.push(WmaticAtoken.address);
        AssetConfig.push(0);
        AssetConfig.push(WmaticVdtoken.address);

        AssetConfigInput.push(AssetConfig);

        AssetConfig = [];

        emissionPerSecond = web3.utils.toWei('0.0002', 'ether');   // emissionPerSecond is 0.0002 MCoin for mint
        curMintTokenEmissionRate = new BigNumber(emissionPerSecond.toString()).div(WAY);
        AssetConfig.push(emissionPerSecond);
        AssetConfig.push(0);
        AssetConfig.push(MintToken.address);
        AssetConfig.push(0);
        AssetConfig.push(ZERO_ADDRESS);

        AssetConfigInput.push(AssetConfig);

        console.log("Config input:" + AssetConfigInput);

        await MCoinIncentives.configureAssets(AssetConfigInput, {from: emissionManager});

        var mintEmissionParams = await MCoinIncentives.assets(MintToken.address);
        await PrintAsset(mintEmissionParams, await MintToken.symbol());
        mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));

        var assetPool = await MCoinIncentives._assetPool(0);
        console.log(assetPool);
        // test success for configureAssets by other account not emissionManager
        // await MCoinIncentives.configureAssets(AssetConfigInput, {from: owner});
    });

    it('handlerAction', async() => {
        var userBalance = web3.utils.toWei('5', 'ether');
        //console.log(userBalance.toString());
        await WmaticAtoken.mint(Andy, userBalance.toString(), {from: minter});

        var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));

        console.log(new BigNumber(await MCoinIncentives.getBlockTime()).toNumber());
        mintStartTimestamp = new BigNumber(await MCoinIncentives.getBlockTime());

        userBalance = web3.utils.toWei('5', 'ether');
        await WmaticAtoken.mint(Andy, userBalance.toString(), {from: minter});
        //totalSupply = new BigNumber(await WmaticAtoken.totalSupply()).div(WAY);
        //userBalance = new BigNumber(await WmaticAtoken.balanceOf(Andy)).div(WAY);
        //console.log(totalSupply.toNumber() + ":" + userBalance.toNumber());
    });

    it('getReward', async() => {
        var index = new BigNumber(await MCoinIncentives.getUserIndex(WmaticAtoken.address, Andy));
        console.log('xxxx=' + index.toNumber());
        var reward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        var mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        assert.equal( reward.div(WAY).toNumber(), mintTotal.toNumber() );
        //console.log(' Andy reward=' +  + ",tatol mint=" + mintTotal.toNumber());
        //mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        var unreward = new BigNumber(await MCoinIncentives.getUserUnclaimedRewards(Andy)).div(WAY);
        console.log(unreward.toNumber());
    });

    it('mulit-handlerAction', async() => {
        var userBalance = web3.utils.toWei('20', 'ether');
        console.log(userBalance.toString());
        var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        await WmaticAtoken.mint(James, userBalance.toString(), {from: minter});

        //var totalSupply = new BigNumber(await WmaticAtoken.totalSupply()).div(WAY);
        //var userBalance = new BigNumber(await WmaticAtoken.balanceOf(Andy)).div(WAY);
        //console.log(totalSupply.toNumber() + ":" + userBalance.toNumber());

        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        //console.log(curBlockTime.toNumber());
        //console.log(new BigNumber(await MCoinIncentives.getUserIndex(WmaticAtoken.address, Andy)).toNumber());
        var reward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        var mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        assert.equal( reward.div(WAY).toNumber(), mintTotal.toNumber() );

        userBalance = web3.utils.toWei('10', 'ether');
        mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        await WmaticAtoken.burn(James, userBalance.toString(), {from: minter});
        var AndyReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        var JamesReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James, {from: James}));
        AndyReward = AndyReward.div(WAY);
        JamesReward = JamesReward.div(WAY);
        // console.log(AndyReward.toNumber() + ":" + JamesReward.toNumber());
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        // console.log(curBlockTime.toNumber());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        // console.log(AndyReward.toNumber() + "," + JamesReward.toNumber() + ":" + mintTotal.toNumber());
        assert.equal( AndyReward.plus(JamesReward).toNumber().toFixed(5), mintTotal.toNumber() );
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
    });

    it ('multi-tokens', async() => {
        var userBalance = web3.utils.toWei('5', 'ether');
        await WmaticVdtoken.mint(Joan, userBalance.toString(), {from: minter});

        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
        var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));
        var AndyReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        var JamesReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James, {from: James}));
        var JoanReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan, {from: Joan}));

        AndyReward = AndyReward.div(WAY);
        JamesReward = JamesReward.div(WAY);
        JoanReward = JoanReward.div(WAY);
        console.log(AndyReward.toNumber() + ',' + JamesReward.toNumber() + ',' + JoanReward.toNumber());
        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
                // console.log(curBlockTime.toNumber());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);

        assert.equal( AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5), mintTotal.toNumber() );

        var userBalance = web3.utils.toWei('5', 'ether');
        await WmaticVdtoken.mint(Joan, userBalance.toString(), {from: minter});
        mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));

        AndyReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        JamesReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James, {from: James}));
        JoanReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan, {from: Joan}));
        AndyReward = AndyReward.div(WAY);
        JamesReward = JamesReward.div(WAY);
        JoanReward = JoanReward.div(WAY);
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        //console.log(mintStartTimestamp.toNumber() + ";" + curBlockTime.toNumber());
        //console.log(AndyReward.toNumber() + ',' + JamesReward.toNumber() + ',' + JoanReward.toNumber());
        assert.equal( AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5), mintTotal.toNumber() );
    });

    it ('reset-emissionManager', async() => {
        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        //console.log(curBlockTime.toNumber());

        var AssetConfigInput = [];
        var AssetConfig = [];
        var emissionPerSecond = web3.utils.toWei('0.008', 'ether');   // emissionPerSecond is 0.001 MCoin
        // first input: token address and staked is 0;
        var totalSupply = new BigNumber(await WmaticAtoken.totalSupply());
        AssetConfig.push(emissionPerSecond);
        AssetConfig.push(totalSupply.toString());
        AssetConfig.push(WmaticAtoken.address);
        totalSupply = new BigNumber(await WmaticVdtoken.totalSupply());
        AssetConfig.push(totalSupply.toString());
        AssetConfig.push(WmaticVdtoken.address);

        AssetConfigInput.push(AssetConfig);

        await MCoinIncentives.configureAssets(AssetConfigInput, {from: emissionManager});

        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
        var t_curBlockTime = curBlockTime;
        var t_curBlockTime = t_curBlockTime.minus(mintStartTimestamp);
        g_mintTotalSupply = t_curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        console.log(g_mintTotalSupply.toNumber());
        curWmaticAtokenEmissionRate = new BigNumber(emissionPerSecond.toString()).div(WAY);
        //mintStartTimestamp = new BigNumber(await MCoinIncentives.getBlockTime());
        mintStartTimestamp = curBlockTime;
        console.log('change mint start time=' + mintStartTimestamp.toNumber());

        AndyReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        JamesReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James, {from: James}));
        JoanReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan, {from: Joan}));
        AndyReward = AndyReward.div(WAY);
        JamesReward = JamesReward.div(WAY);
        JoanReward = JoanReward.div(WAY);

        //console.log(AndyReward.toNumber() + ',' + JamesReward.toNumber() + ',' + JoanReward.toNumber()
        //           + ',' + AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5));
        assert.equal( AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5), g_mintTotalSupply.toNumber() );

        //var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        //mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));

        var userBalance = web3.utils.toWei('5', 'ether');
        await WmaticVdtoken.burn(Joan, userBalance.toString(), {from: minter});
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        //console.log(curBlockTime.toNumber() + ',' + mintStartTimestamp.toNumber());

        AndyReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy, {from: Andy}));
        JamesReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James, {from: James}));
        JoanReward = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan, {from: Joan}));
        AndyReward = AndyReward.div(WAY);
        JamesReward = JamesReward.div(WAY);
        JoanReward = JoanReward.div(WAY);
        console.log(AndyReward.toNumber() + ',' + JamesReward.toNumber() + ',' + JoanReward.toNumber()
                    + ',' + AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5));
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        assert.equal( AndyReward.plus(JamesReward).plus(JoanReward).toNumber().toFixed(5), g_mintTotalSupply.plus(mintTotal).toNumber() );
        //console.log(g_mintTotalSupply.plus(mintTotal).toNumber());
    });

    it ('check-reward', async() => {
        var JoanRewards = new BigNumber(await MCoinIncentives.getUserUnclaimedRewards(Joan));
        // console.log( JoanRewards.div(WAY).toNumber() );

        await MCoinIncentives.claimRewards(assets, JoanRewards, Joan, {from: Joan});
        var JoanMCoinBalance = new BigNumber( await MCoin.balanceOf(Joan));
        // console.log( JoanMCoinBalance.div(WAY).toNumber() );
        assert.equal( JoanRewards.toNumber().toFixed(8), JoanMCoinBalance.toNumber().toFixed(8) );
        //console.log( checkReward.logs[5].args['amount'].toString() );
        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
    });

    it ('burn-over', async() => {
        var AndyBalance = new BigNumber(await WmaticAtoken.balanceOf(Andy));
        var JamesBalance = new BigNumber(await WmaticAtoken.balanceOf(James));
        var JoanBalance = new BigNumber(await WmaticVdtoken.balanceOf(Joan));
        //var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        //mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));
        //console.log(AndyBalance.div(WAY).toNumber() + "," +
        //            JamesBalance.div(WAY).toNumber() + "," +
        //            JoanBalance.div(WAY).toNumber());
        //console.log(new BigNumber(await WmaticVdtoken.scaledTotalSupply()).toNumber());
        await WmaticVdtoken.burn(Joan, JoanBalance, {from: minter});
        //mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        //mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));
        //console.log(new BigNumber(await WmaticAtoken.scaledTotalSupply()).toNumber() + "," + AndyBalance.toNumber());
        console.log("ddd=" + new BigNumber(await web3.eth.getBalance(minter)).toString());
        await WmaticAtoken.burn(Andy, AndyBalance, {from: minter});

        //mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        //mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        //await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));
        //console.log(new BigNumber(await WmaticAtoken.scaledTotalSupply()).toNumber() + "," + JamesBalance.toNumber());
        await WmaticAtoken.burn(James, JamesBalance, {from: minter});

        var mintEmissionParams = await MCoinIncentives.assets(WmaticAtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticAtoken.symbol()));
        mintEmissionParams = await MCoinIncentives.assets(WmaticVdtoken.address);
        await PrintAsset(mintEmissionParams, (await WmaticVdtoken.symbol()));
        var curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
        curBlockTime = curBlockTime.minus(mintStartTimestamp);
        mintTotal = curBlockTime.multipliedBy(curWmaticAtokenEmissionRate);
        g_mintTotalSupply = g_mintTotalSupply.plus(mintTotal);
        console.log(g_mintTotalSupply.toNumber());

        var AndyRewards = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy));
        var JamesRewards = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James));
        var JoanRewards = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan));
        var JoanMCoinBalance = new BigNumber( await MCoin.balanceOf(Joan));
//        console.log(AndyRewards.div(WAY).toNumber() + "," +
//                    JamesRewards.div(WAY).toNumber() + "," +
//                    JoanRewards.div(WAY).toNumber() + "," +
//                    JoanMCoinBalance.div(WAY).toNumber() + "," +
//                    AndyRewards.plus(JamesRewards).plus(JoanRewards).plus(JoanMCoinBalance).div(WAY));
        assert.equal( AndyRewards.plus(JamesRewards).plus(JoanRewards).plus(JoanMCoinBalance).div(WAY).toNumber().toFixed(8),
                      g_mintTotalSupply.toNumber().toFixed(8));
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());

        // re-mint for andy
        var userBalance = web3.utils.toWei('5', 'ether');
        await WmaticAtoken.mint(Andy, userBalance.toString(), {from: minter});
        curBlockTime = new BigNumber(await MCoinIncentives.getBlockTime());
        console.log(curBlockTime.toNumber());
        var AndyRewards1 = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy));
        var JamesRewards1 = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, James));
        var JoanRewards1 = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Joan));
        assert.equal(AndyRewards1.toNumber(), AndyRewards.toNumber());
        assert.equal(JamesRewards1.toNumber(), JamesRewards.toNumber());
        assert.equal(JoanRewards1.toNumber(), JoanRewards.toNumber());
    });

    it ('retrieve', async() => {
        var MCoinBalance = new BigNumber(await MCoin.balanceOf(MCoinIncentives.address));
        //console.log(MCoinBalance.toNumber());
        //var event = await MCoinIncentives.retrieve(MCoinBalance, {from: Andy});
        var AndyRewards = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy));
        console.log(AndyRewards.toNumber());

        var event = await MCoinIncentives.retrieve(MCoinBalance, {from: owner});
        var MCoinBalance1 = new BigNumber(await MCoin.balanceOf(owner));
        assert.equal(MCoinBalance.toNumber(), MCoinBalance1.toNumber());

        AndyRewards = new BigNumber(await MCoinIncentives.getRewardsBalance(assets, Andy));
        console.log(AndyRewards.toNumber());
        // await MCoinIncentives.claimRewards(assets, AndyRewards, Andy, {from: Andy});
        //console.log(MCoinBalance.toNumber());
        //console.log(event);
    });

    it ('Config-Algorithm', async() => {
        var algorithmParams = [
            9000,
            2000,
            8500
        ];

        await MCoinIncentives.configureAlgorithmParams(algorithmParams, {from: emissionManager});
    });

})