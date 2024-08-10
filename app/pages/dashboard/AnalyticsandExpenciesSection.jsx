"use client";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useState } from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import Chart from "../../components/Chart";

const data = [
  { id: 0, value: 20, label: "Grocery" },
  { id: 1, value: 15, label: "Medical Care" },
  { id: 2, value: 10, label: "Shopping" },
  { id: 3, value: 17, label: "Entertainment" },
];

const AnalyticsandExpenciesSection = () => {
  const [time, setTime] = useState("");

  const handleChange = (e) => {
    setTime(e.target.value);
  };

  return (
    <div className="flex flex-col md:flex-row space-y-5 md:space-y-0 md:space-x-4 my-5">
      <div className="rounded-md shadow-md flex-[1]">
        <Chart />
      </div>
      <div className="p-3 rounded-md shadow-md flex-[1]">
        <div className="flex align-center justify-between">
          <span>All Expencies</span>

          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id="demo-select-small-label">Time</InputLabel>
            <Select
              labelId="demo-select-small-label"
              id="demo-select-small"
              value={time}
              label="Age"
              onChange={handleChange}
            >
              <MenuItem value="Day">Day</MenuItem>
              <MenuItem value="Month">Month</MenuItem>
              <MenuItem value="Year">Year</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div>
          <PieChart
            series={[
              {
                data,
                highlightScope: { faded: "global", highlighted: "item" },
                faded: {
                  innerRadius: 30,
                  additionalRadius: -10,
                  color: "gray",
                },
              },
            ]}
            height={150}
          />
        </div>
      </div>
    </div>
  );
};
export default AnalyticsandExpenciesSection;
