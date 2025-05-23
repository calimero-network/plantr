import { useActions } from "./useActions";
import { useTypedSelector } from "./useTypedSelector";

export const useModal = () => {
  const modalsData = useTypedSelector(({ modals }: any) => modals);
  const {
    openModalCreate,
    openModalDayInfo,
    openModalEdit,
    closeModalCreate,
    closeModalDayInfo,
    closeModalEdit,
    openErrorModal,
    closeErrorModal,
  } = useActions();

  return {
    ...modalsData,
    openModalCreate,
    openModalDayInfo,
    openModalEdit,
    closeModalCreate,
    closeModalDayInfo,
    closeModalEdit,
    openErrorModal,
    closeErrorModal,
  };
};
