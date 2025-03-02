import { observer } from "mobx-react-lite";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import authStore from "../../store/authStore.js";
import modalStore from "../../store/modalStore.js";
import axios from "axios";
import GoldMedal from "../../assets/Medal-Gold.svg?react";
import SilverMedal from "../../assets/Medal-Silver.svg?react";
import BronzeMedal from "../../assets/Medal-Bronze.svg?react";
import DeleteID from "../../components/account/DeleteID.jsx";

const RestInfo = observer(() => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);

  const fetchProfile = async () => {
    const accessToken = localStorage.getItem("token");

    if (!accessToken) {
      console.error("[Error] 프로필 정보를 불러올 수 없음: 토큰 없음");
      alert("로그인이 필요합니다.");
      authStore.setLoggedIn(false);
      window.location.replace("/");
      return;
    }

    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BE_API_URL}/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("API 응답 데이터:", data); // 추가
      setProfileData(data); // 수정: data.profile로 접근
    } catch (error) {
      console.error("[Error] 프로필 정보를 불러오는데 실패:", error);
      if (error.response) {
        console.error("응답 상태 코드:", error.response.status);
        console.error("응답 데이터:", error.response.data);
      } else if (error.request) {
        console.error("요청은 보내졌으나 응답 없음:", error.request);
      } else {
        console.error("요청 설정 중 에러 발생:", error.message);
      }

      if (error.response?.status === 403) {
        modalStore.openModal("oneBtn", {
          message: (
            <>
              <p>세션이 만료되었습니다. 다시 로그인해주세요!.</p>
            </>
          ),
          onConfirm: async () => {
            modalStore.closeModal();
            localStorage.removeItem("token");
            authStore.setLoggedIn(false);
            window.location.replace("/");
          },
          backgroundClickNoClose: true
        });
      }
    }
  };
  // 페이지 진입 시 로그인 체크 및 프로필 정보 요청
  useEffect(() => {
    authStore.checkLoggedIn();
    if (!authStore.loggedIn) {
      alert("로그인 후 이용해주세요!");
      window.location.replace("/");
    } else {
      fetchProfile();
    }
  }, []);

  // EditableField 훅 (프로필 정보를 편집할 필드를 관리)
  function useEditableField(fieldKey) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(profileData?.[fieldKey] || "");

    useEffect(() => {
      console.log(
        `ProfileData 업데이트 감지됨: ${fieldKey} = ${profileData?.[fieldKey]}`,
      ); // 수정 - 전찬민
      setValue(profileData?.[fieldKey] || "");
    }, [profileData, fieldKey]);

    function changeField() {
      console.log(`수정 모드 활성화: ${fieldKey}`); // 수정 - 전찬민
      setIsEditing(true);
    }

    function handleInputChange(event) {
      const newValue = event.target.value;
      console.log(`입력값 변경됨: ${newValue}`);
      if (fieldKey === "nickname" && newValue.length > 8) return;
      setValue(newValue);
    }

    async function saveField() {
      // 값이 변경되지 않았다면 그냥 종료
      if (value === profileData?.[fieldKey]) {
        console.warn("값이 변경되지 않음: ${value}");
        setIsEditing(false);
        return;
      }
      if (value.trim() === "") {
        modalStore.openModal("oneBtn", {
          message: (
            <>
              <p>내용을 작성해주세요!.</p>
            </>
          ),
          onConfirm: async () => {
            modalStore.closeModal();
          },
        });
        return;
      }

      try {
        const url =
          fieldKey === "nickname"
            ? `${import.meta.env.VITE_BE_API_URL}/users/profile/nickname`
            : `${import.meta.env.VITE_BE_API_URL}/users/profile/introduce`;

        const accessToken = localStorage.getItem("token");
        const body = { [fieldKey]: value };

        console.log("닉네임 변경 요청: ${JSON.stringify(body)}"); // 수정 - 전찬민

        await axios.patch(url, body, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        // 수정 후 최신 프로필 정보 가져오기
        await fetchProfile();
        setIsEditing(false);

      } catch (error) {
        console.error("[Error] 프로필 업데이트 실패:", error);

        if (error.response) {
          console.error("응답 상태 코드:", error.response.status);
          console.error("응답 데이터:", error.response.data);
        } else if (error.request) {
          console.error("요청은 보내졌으나 응답 없음:", error.request);
        } else {
          console.error("요청 설정 중 에러 발생:", error.message);
        }
      } // 수정 - 전찬민
    }

    return { value, isEditing, changeField, handleInputChange, saveField };
  }

  const nicknameField = useEditableField("nickname");
  const introduceField = useEditableField("introduce");
  console.log("매칭 카운트 확인", profileData);
  const viewMedal = useMemo(() => {
    const count = profileData?.matchingCount || 0;
    if (count >= 5) return <GoldMedal/>;
    if (count >= 3) return <SilverMedal/>;
    if (count >= 1) return <BronzeMedal/>;
    return (
      <span className="pl-2 pt-2">매칭을 하면 메달을 얻을 수 있어요!</span>
    );
  }, [profileData?.matchingCount]);
  return (
    <div
      className="flex max-w-[300px] flex-col rounded-2xl border border-[#ff6445] bg-white px-7 py-7 drop-shadow-lg min-[400px]:min-w-[380px] min-[760px]:max-w-[380px]">
      <h1 className="mb-10 text-left text-[28px] font-bold">내 정보</h1>
      <div className="flex h-fit flex-col justify-between">
        <div className="flex flex-col gap-5">
          {/* 닉네임 수정 */}
          <EditableField label="닉네임" field={nicknameField} maxLength={8}/>

          {/* 한 줄 소개 수정 */}
          <EditableField label="짧은 소개" field={introduceField}/>

          {/* 메달 표시 */}
          <div>
            <div className="flex items-center gap-1 border-b-gray-300 text-left text-[15px]">
              <p className="font-bold">메달</p>
              <div
                className="group relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#CDCDCD] text-gray-400">
                <span className="-mr-5 cursor-pointer pr-5 text-sm text-white">
                  ?
                </span>
                {/* 도움말 박스 */}
                <div
                  className="absolute bottom-[-10px] left-full ml-3 hidden min-w-min cursor-default flex-col gap-1 rounded-md border border-gray-300 bg-white p-4 text-base text-black group-hover:block">
                  <h3 className="pb-1 text-center">식사 횟수별 메달 안내</h3>
                  <div className="flex flex-col">
                    <div className="flex items-center text-nowrap text-sm">
                      <GoldMedal/>
                      <span>연간 누적 참여 5회</span>
                    </div>
                    <div className="flex items-center text-nowrap text-sm">
                      <SilverMedal/>
                      <span>연간 누적 참여 3회</span>
                    </div>
                    <div className="flex items-center text-nowrap text-sm">
                      <BronzeMedal/>
                      <span>연간 누적 참여 1회</span>
                    </div>
                  </div>
                  {/* 화살표 모양 */}
                  <div
                    className="absolute bottom-3 right-[calc(100%-0.35rem)] h-3 w-3 rotate-45 border-b border-l border-gray-300 bg-white"></div>
                </div>
              </div>
            </div>
            <div className="flex items-start text-sm">{viewMedal}</div>
          </div>

          {/* 계정 정보 */}
          <div className="flex flex-col gap-2">
            <p className="mt-5 text-left text-[15px] font-bold">계정 정보</p>
            <div className="flex h-full flex-col items-start text-[15px] text-[#909090]">
              <motion.button
                whileTap={{ scale: 0.95, backgroundColor: "#90909030" }}
                transition={{ duration: 0.1 }}
                className="mb-auto rounded-md px-2 py-1"
              >
                {profileData &&
                  profileData.signupType?.toUpperCase() === "EMAIL" && (
                    <Link to="/mypage/changepw">비밀번호 변경</Link>
                  )}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex items-start text-left text-[13px] text-[#b0b0b0]">
          <motion.button
            whileTap={{ scale: 0.95, backgroundColor: "#90909030" }}
            transition={{ duration: 0.1 }}
            className="rounded-md px-2 py-1"
            onClick={() =>
              modalStore.openModal("twoBtn", {
                message: () => <DeleteID/>,
                onConfirm: () => {
                  modalStore.openModal("twoBtn", {
                    message: "정말로 탈퇴 하시겠습니까?",
                    onConfirm: async () => {
                      try {
                        const accessToken = localStorage.getItem("token");
                        if (!accessToken) {
                          console.error("탈퇴하기 요청 실패: 토큰이 없습니다.");
                          return;
                        }

                        const response = await axios.delete(
                          `${import.meta.env.VITE_BE_API_URL}/users/withdrawal`,
                          {
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${accessToken}`,
                            },
                          },
                        );
                        if (response.status === 200) {
                          modalStore.openModal("oneBtn", {
                            message: "탈퇴하기 완료.",
                            onConfirm: async () => {
                              await modalStore.closeModal();
                              localStorage.removeItem("token");
                              authStore.setLoggedIn(false);
                              navigate("/");
                            },
                            backgroundClickNoClose: true
                          });
                          console.log("탈퇴하기 완료");
                        }
                      } catch (error) {
                        console.log(error)
                        if (error.status === 400) {
                          modalStore.openModal("oneBtn", {
                            message: (
                              <>
                                <p>현재 진행 중인 매칭이 있어</p>
                                <p>탈퇴할 수 없습니다.</p>
                              </>
                            ),
                            onConfirm: async () => {
                              await modalStore.closeModal();
                            },
                            backgroundClickNoClose: true
                          });
                          console.error("탈퇴하기 요청 실패!:", error);
                        } else {
                          modalStore.openModal("oneBtn", {
                            message: (
                              <>
                                <p>서버에 오류가 발생했습니다.</p>
                                <p>잠시 후 다시 시도해주세요.</p>
                              </>
                            ),
                            onConfirm: async () => {
                              await modalStore.closeModal();
                            },
                            backgroundClickNoClose: true
                          });
                          console.error("탈퇴하기 요청 실패!:", error);
                        }
                      }
                    },
                    reverseOrder: true, // 두 번째 모달의 버튼 순서를 뒤집습니다.
                  });
                },
                reverseOrder: true, // 첫 번째 모달의 버튼 순서를 뒤집습니다.
              })
            }
          >
            탈퇴하기
          </motion.button>
        </div>
      </div>
    </div>
  );
});

const EditableField = ({ label, field, maxLength }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[15px]">
        <span className="font-bold">{label}</span>
        {field.isEditing ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="rounded-md border border-black px-1.5"
            onClick={field.saveField}
          >
            완료
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="rounded-md border border-[#909090] px-1.5 text-[#909090]"
            onClick={field.changeField}
          >
            수정
          </motion.button>
        )}
      </div>
      <div
        className="relative flex min-h-10 h-full items-center justify-between border-b border-b-[#EAEAEA] bg-[#F8F8F8] text-left text-[15px]">
        {field.isEditing ? (
          <>
            <input
              type="text"
              className="flex-1 rounded-lg bg-inherit w-full break-all py-2 px-2 text-left outline-none"
              value={field.value}
              onChange={field.handleInputChange}
              autoFocus
              maxLength={maxLength}
            />
            {maxLength && (
              <span className="absolute top-full pt-1 text-xs text-gray-400">
                최대 {maxLength}자리만 가능합니다.
              </span>
            )}
          </>
        ) : (
          <span className="flex-1 rounded-lg py-2 px-2 w-full break-all text-[#909090]">{field.value}</span>
        )}
      </div>
    </div>
  );
};

export default RestInfo;
