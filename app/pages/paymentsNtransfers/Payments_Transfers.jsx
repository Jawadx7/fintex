"use client";

import PrimaryButton from "../../components/PrimaryButton";
import Input from "../../components/Input";
import { Button } from "@mui/material";

const PaymentsAndTransfers = () => {
  return (
    <div className="px-[3%] overflow-y-scroll">
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

      <article className="py-4 border-b-2 border-gray-200">
        <h3 className="text-sm text-gray-900">Select Source Bank</h3>
        <small className="text-gray-500">
          Select the bank account you want to transfer funds from
        </small>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <h3 className="text-sm text-gray-900">Transfer Note (Optional)</h3>
        <small className="text-gray-500">
          Please provide any additional information or instructions related to
          the transfer
        </small>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">
          Bank account details
        </h2>
        <small className="text-gray-500">
          Enter the bank account details of the recipient
        </small>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <small className="text-gray-500">Recipient&apos;s email address</small>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <small className="text-gray-500">
          Recipient&apos;s bank account number
        </small>
      </article>
      <article className="py-4 border-b-2 border-gray-200">
        <small className="text-gray-500">Amount</small>
      </article>
      <Button variant="text" type="submit" className="text-primary">
        Transfer Funds
      </Button>
    </div>
  );
};

export default PaymentsAndTransfers;
