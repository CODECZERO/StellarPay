import {configureStore} from "@reduxjs/toolkit"
import employeeReducer from "../slices/employeeSlices.js"

export const store=configureStore({
    reducre:{
        employee:employeeReducer,
    },
});

