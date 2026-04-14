import axios from "axios";

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

export const createPlantApi = (plantData) => 
    axios.post("http://localhost:8080/api/plants", plantData, authHeader());