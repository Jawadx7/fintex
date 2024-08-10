"use client";

import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import { transactions } from "../../../public/data/transactions";

const TransactionsSection = () => {
  return (
    <div className="mb-3">
      <h1>Recent Transactions</h1>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell align="center">ID</TableCell>
              <TableCell align="center">Type</TableCell>
              <TableCell align="center">Amount($)</TableCell>
              <TableCell align="center">Date</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Charges($)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((row) => (
              <TableRow
                key={row.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell align="center">{row.id}</TableCell>
                <TableCell align="center">{row.type}</TableCell>
                <TableCell align="center">{row.amount}</TableCell>
                <TableCell align="center">{row.date}</TableCell>
                <TableCell align="center">
                  <small
                    className={`p-2 rounded-md ${
                      row.status === "success"
                        ? "text-white bg-primary_fade"
                        : row.status === "pending"
                        ? "bg-gold_fade text-primary"
                        : "text-red-500"
                    }`}
                  >
                    {row.status}
                  </small>
                </TableCell>
                <TableCell align="center">{row.charges}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
export default TransactionsSection;
