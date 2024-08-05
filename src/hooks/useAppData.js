import { AppDataContext } from '../context';
import { useContext } from 'react';

const useAppData = () => {
  const { socketData, dataRef, socket, handleData, focusedElement, reRender, proceed, setProceed, proceedEventArray, setProceedEventArray, colors } = 
  useContext(AppDataContext);

  const findDesiredData = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData;
  };

  const getObjType = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData?.Properties?.Type;
  };

  return {
    socketData,
    findDesiredData,
    getObjType,
    dataRef,
    socket,
    handleData,
    focusedElement,
    reRender,
    proceed,
    setProceed,
    proceedEventArray,
    setProceedEventArray,
    colors
  };
};
export default useAppData;
