"use client";

import PrimaryButton from "../../components/PrimaryButton";
import Input from "../../components/Input";
import { Button } from "@mui/material";
import { useState } from "react";

const InputComponent = ({
  heading,
  inputName,
  inputID,
  inputType,
  inputLabel,
  inputValue,
  inputSetValue,
}) => {
  return (
    <article className="py-4 border-b-2 border-gray-200 flex-col md:flex-row flex md:space-x-5">
      <div className="flex-[2]">
        <small className="text-gray-500">{heading}</small>
      </div>
      <div className="flex-[5] w-full md:mt-0 mt-3">
        {/* className="w-full md:w-2/3 text-sm outline-none border-2 border-gray-300 p-2 rounded-md" */}
        <div className="w-full md:w-2/3">
          <Input
            name={inputName}
            id={inputID}
            type={inputType}
            label={inputLabel}
            value={inputValue}
            setValue={inputSetValue}
          />
        </div>
      </div>
    </article>
  );
};

const PaymentsAndTransfers = () => {
  const [selectedBank, setSelectedBank] = useState("");
  const [transferNote, setTransferNote] = useState("Moshi Moshi");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");

  const handlePayment = (e) => {
    e.preventDefault();
  };
  return (
    <form
      onSubmit={handlePayment}
      className="styled_srollbar px-[3%] h-[90vh] md:overflow-y-scroll pb-5"
    >
      <div className="w-full md:w-1/2">
        <h2 className="font-semibold text-base">Payment Transfers</h2>
        <small className="text-gray-500">
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Illo labore
          dolorem totam tempore consequuntur doloribus reprehenderit nemo a
          nobis voluptates.
        </small>
      </div>
      <div className="mt-5 py-4 border-b-2 border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">
          Transfer details
        </h2>
        <small className="text-gray-500">
          Enter the details of the recipient
        </small>
      </div>

      <article className="py-4 border-b-2 border-gray-200 flex-col md:flex-row flex md:space-x-5">
        <div className="flex-[2]">
          <h3 className="text-sm text-gray-900">Select Source Bank</h3>
          <small className="text-gray-500">
            Select the bank account you want to transfer funds from
          </small>
        </div>
        <div className="flex-[5] w-full md:mt-0 mt-3">
          <select
            name="bank_account"
            id="bank_account"
            className="w-full md:w-2/3 text-sm outline-none border-2 border-gray-300 p-2 rounded-md"
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
          >
            <option value="BankA">Bank A</option>
            <option value="BankB">Bank B</option>
            <option value="BankC">Bank C</option>
          </select>
        </div>
      </article>

      <article className="py-4 border-b-2 border-gray-200 flex-col md:flex-row flex md:space-x-5">
        <div className="flex-[2]">
          <h3 className="text-sm text-gray-900">Transfer Note (Optional)</h3>
          <small className="text-gray-500">
            Please provide any additional information or instructions related to
            the transfer
          </small>
        </div>
        <div className="flex-[5] w-full md:mt-0 mt-3">
          <textarea
            name="transfe_note"
            id="transfer_note"
            className="w-full h-28 md:w-2/3 text-sm outline-none border-2 border-gray-300 p-2 rounded-md"
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
          ></textarea>
        </div>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">
          Bank account details
        </h2>
        <small className="text-gray-500">
          Enter the bank account details of the recipient
        </small>
      </article>
      <InputComponent
        heading="Recipient's email address"
        inputName="recipientEmail"
        inputID="recipientEmail"
        inputType="email"
        inputLabel="Enter email address"
        inputValue={recipientEmail}
        inputSetValue={setRecipientEmail}
      />
      <InputComponent
        heading="Recipient's bank account number"
        inputName="account_number"
        inputID="account_number"
        inputType="text"
        inputLabel="Enter account number"
        inputValue={accountNumber}
        inputSetValue={setAccountNumber}
      />
      <InputComponent
        heading="Amount"
        inputName="amount"
        inputID="amount"
        inputType="text"
        inputLabel="Enter amount"
        inputValue={amount}
        inputSetValue={setAmount}
      />
      <Button
        variant="text"
        type="submit"
        className="text-white bg-primary my-3 w-full hover:bg-primary"
      >
        Transfer Funds
      </Button>
    </form>
  );
};

export default PaymentsAndTransfers;
