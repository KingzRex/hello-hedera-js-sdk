const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
} = require("@hashgraph/sdk");
require("dotenv").config();

async function main() {
  //Grab your Hedera testnet account ID and private key from your .env file
  const myAccountId = process.env.MY_ACCOUNT_ID;
  const myPrivateKey = process.env.MY_PRIVATE_KEY;

  // If we weren't able to grab it, we should throw a new error
  if (myAccountId == null || myPrivateKey == null) {
    throw new Error(
      "Environment variables myAccountId and myPrivateKey must be present"
    );
  }

  // Create our connection to the Hedera network
  // The Hedera JS SDK makes this really easy!
  const client = Client.forTestnet();

  client.setOperator(myAccountId, myPrivateKey);

  //Create new keys
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  //Create a new account with 1,000 tinybar starting balance
  const newAccountTransactionResponse = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  // Get the new account ID
  const getReceipt = await newAccountTransactionResponse.getReceipt(client);
  const newAccountId = getReceipt.accountId;

  console.log("The new account ID is: " + newAccountId);

  //Verify the account balance
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);

  console.log(
    "The new account balance is: " +
      accountBalance.hbars.toTinybars() +
      " tinybars."
  );

  //Create the transfer transaction
  const sendHbar = await new TransferTransaction()
    .addHbarTransfer(myAccountId, Hbar.fromTinybars(-1000))
    .addHbarTransfer(newAccountId, Hbar.fromTinybars(1000))
    .execute(client);

  //Verify the transaction reached consensus
  const transactionReceipt = await sendHbar.getReceipt(client);
  console.log(
    "The transfer transaction from my account to the new account was: " +
      transactionReceipt.status.toString()
  );

  //Request the cost of the query
  const queryCost = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .getCost(client);

  console.log("The cost of query is: " + queryCost);

  //Check the new account's balance
  const getNewBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);

  console.log(
    "The account balance after the transfer is: " +
      getNewBalance.hbars.toTinybars() +
      " tinybars."
  );

  //Create a new topic
  let txResponse = await new TopicCreateTransaction().execute(client);

  //Grab the newly generated topic ID
  let receipt = await txResponse.getReceipt(client);
  let topicId = receipt.topicId;
  console.log(`Your topic ID is: ${topicId}`);

  // Wait 5 seconds between consensus topic creation and subscription creation
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Create the query
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(client, null, (message) => {
      let messageAsString = Buffer.from(message.contents, "utf8").toString();
      console.log(
        `${message.consensusTimestamp.toDate()} Received: ${messageAsString}`
      );
    });

  // Send one message
  let sendResponse = await new TopicMessageSubmitTransaction({
    topicId: topicId,
    message: "Hello, HCS!",
  }).execute(client);

  //Get the receipt of the transaction
  await sendResponse.getReceipt(client);

  //Get the status of the transaction
  const transactionStatus = getReceipt.status;
  console.log("The message transaction status " + transactionStatus);

  //Create a new sender account with 1,000 tinybar starting balance
  const senderAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  //Create a recipient account with 0 tinybar starting balance
  const recipientAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  // Get the sender account ID
  await senderAccount.getReceipt(client);
  const senderAccountId = getReceipt.accountId;

  //Log the sender account ID
  console.log("The sender account ID is: " + senderAccountId);

  // Get the recipient account ID
  await recipientAccount.getReceipt(client);
  const recipientAccountId = getReceipt.accountId;

  //Log the recipient account ID
  console.log("The recipient account ID is: " + recipientAccountId);

  //Create a transaction to schedule
  const transaction = new TransferTransaction()
    .addHbarTransfer(senderAccountId, Hbar.fromTinybars(-1))
    .addHbarTransfer(recipientAccountId, Hbar.fromTinybars(1));

    //Log the recipient account ID
  console.log("The recipient account ID is: " + recipientAccountId);
}
main();
