import { registerEmployee,getEmployeeDetails} from "../services/sorobanService.js";
import { useSelector,useDispatch } from "react-redux";

//creating a custom hook to check if a user
//is registered or not in a system

export function useCheckUser(walletAddress){
    //using store/react-redux here 
    //to manage state

    

    if(walletAddress.length==0||walletAddress.isEmpty()){
        //use dispatch here to return error here
        
    }

    const resultData=await getEmpDeatilsWithWA()


}