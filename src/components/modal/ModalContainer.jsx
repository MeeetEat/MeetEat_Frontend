import { observer } from 'mobx-react';
import modalStore from '../../store/modalStore.js';
import OneBtnModal from "../common/OneBtnModal.jsx";
import TwoBtnModal from "../common/TwoBtnModal.jsx";

const Modal = observer(() => {
  if (!modalStore.isOpen) return null;

  const { modalStyle, modalProps } = modalStore;
  let { message, onConfirm, backgroundClickNoClose } = modalProps; // onConfirm, onCancel 등

  // 만약 message가 함수라면 호출하여 최신 JSX 요소를 생성
  if (typeof message === 'function') {
    message = message();
  }

  // one 버튼 예 클릭시
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();  // 확인을 선택했을 때 호출
    }
  };
  // backgroundClickNoClose : true 시 배경을 눌러도 모달이 닫히지 않음
  const handleBackgroundClick = () => {
    if (!backgroundClickNoClose) {
      modalStore.closeModal();
    }
  };

  // modalType에 따른 다른 모달 내용 처리
  const renderModalContent = () => {
    switch (modalStyle) {
      case 'oneBtn':
        return (
          <OneBtnModal
            message={message}
            onConfirm={handleConfirm}
            backgroundClickNoClose={backgroundClickNoClose}
          />
        );
      case 'twoBtn':
        return (
          <TwoBtnModal
            message={message}
            onConfirm={handleConfirm}
            reverseOrder={modalProps.reverseOrder}
            backgroundClickNoClose={backgroundClickNoClose}
          />
        );
      default:
        return <p>오타나 파일 확인하세요</p>;
    }
  };

  return (
    <>
      <div
        className="flex fixed top-0 left-0 right-0 bottom-0 justify-center items-center bg-black/40 z-20"
        onClick={handleBackgroundClick} // 모달 닫기
      >
      </div>
      <div
        className="flex flex-col gap-5 fixed z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 p-5 min-w-fit bg-white rounded-lg drop-shadow-lg"
      >
        {renderModalContent()}
      </div>
    </>
  );
});

export default Modal;
