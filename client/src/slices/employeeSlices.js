import {createSlice} from "@reduxjs/toolkit";

const initalState={
    employeeId:null,
    monthlySalary:null,
    email:null,
    isRegistered:false,
    isLoading:true,
    error:null,
}

const empolyeeSlice=createSlice({
    name:"empolyee",
    initalState,
    reducers:{
        setEmployee:(state,action)=>{
            state.employeeId=action.payload.employeeId;
            state.monthlySalary=action.payload.monthlySalary;
            state.email=action.payload.email;
            state.isRegistered=true;
            state.isLoading=false;
        },
        setLoading:(state,action)=>{
            state.isLoading=action.payload;
        },
        setError:(state,action)=>{
            state.error=action.payload;
            state.isLoading=false;
        },
        clearEmpolyee:(state,action)=>{
            state.employeeId=null;
            state.monthlySalary=null;
            state.email=null;
            state.isRegistered=false;
        },
    },
});

export const {setEmployee,setLoading,setError,clearEmpolyee} = empolyeeSlice.actions;
export default empolyeeSlice.reducers;