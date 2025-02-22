import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import GoldMedal from "../../assets/Medal-Gold.svg?react";
import SilverMedal from "../../assets/Medal-Silver.svg?react";
import BronzeMedal from "../../assets/Medal-Bronze.svg?react";
import modalStore from "../../store/modalStore.js";
import axios from "axios";
import { useInView } from 'react-intersection-observer';
import RestReviewItem from "./RestReviewItem.jsx";
import ReactLoading from "react-loading";

const RestReviews = observer(() => {
  const [historyData, setHistoryData] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // 무한 스크롤 관련
  const [page, setPage] = useState(0);
  const [totalPage, setTotalPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [moreHistory, inView] = useInView({
    threshold: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  // ✅ 매칭 히스토리 가져오기 (4개씩 추가)
  const fetchHistory = async () => {
    if (page > totalPage) {
      setHasMore(false);
      return;
    }

    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BE_API_URL}/matching/history?page=${page}&size=4`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      setIsLoading(true)
      setHistoryData(prevData => {
        const newContent = { ...prevData };
        Object.keys(data.content).forEach(key => {
          newContent[Object.keys(newContent).length] = data.content[key];
        });
        return newContent;
      });
      setTotalPage(data.page.totalPages);
      setPage(prevPage => prevPage + 1);
    } catch (error) {
      console.error("매칭 히스토리 정보를 불러오는데 실패했습니다.", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchHistory();
  }, [])

  useEffect(() => {
    if (inView && hasMore) {
      fetchHistory();
    }
  }, [inView, hasMore]);
  console.log(historyData);
  console.log(page, totalPage);
  // ✅ 신고하기/차단하기 팝오버 관련 상태 및 ref
  const [activePopOver, setActivePopOver] = useState(null);
  const popOverRef = useRef(null);

  // 팝오버 토글 함수
  const popOver = (itemId, userId) => {
    const uniqueId = `${itemId}-${userId}`;
    setActivePopOver(activePopOver === uniqueId ? null : uniqueId);
  };

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popOverRef.current && !popOverRef.current.contains(event.target)) {
        setActivePopOver(null);
      }
    };
    if (activePopOver !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activePopOver]);

  // ✅ 모달 열고 닫기 함수
  const toggleModal = async (type, userId) => {
    console.log(typeof userId)
    try {
      let modalMessage = "";
      switch (type) {
        case "ban":
          modalMessage = `${userId}를 차단하시겠습니까?`;
          break;
        case "unBan":
          modalMessage = `${userId}를 차단 해제하시겠습니까?`;
          break;
        case "report":
          modalMessage = `${userId}를 신고하시겠습니까?`;
          break;
        case "unReport":
          modalMessage = `${userId}를 신고 해제하시겠습니까?`;
          break;
        default:
          modalMessage = "해당 작업을 진행하시겠습니까?";
          break;
      }

      modalStore.openModal("twoBtn", {
        message: modalMessage,
        onConfirm: async () => {
          try {
            let response;
            if (type === "ban") {
              response = await axios.post(
                `${import.meta.env.VITE_BE_API_URL}/ban?bannedId=${userId}`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );
            } else if (type === "unBan") {
              response = await axios.delete(
                `${import.meta.env.VITE_BE_API_URL}/ban?bannedId=${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );
            } else if (type === "report") {
              response = await axios.post(
                `${import.meta.env.VITE_BE_API_URL}/report?reportedId=${userId}`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );
            } else if (type === "unReport") {
              response = await axios.delete(
                `${import.meta.env.VITE_BE_API_URL}/report?reportedId=${userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
            if (response.status === 200) {
              // 성공 메시지를 담은 모달 띄우기
              let successMsg = "";
              switch (type) {
                case "ban":
                  successMsg = `${userId}를 차단했습니다.`;
                  break;
                case "unBan":
                  successMsg = `${userId}를 차단 해제했습니다.`;
                  break;
                case "report":
                  successMsg = `${userId}를 신고했습니다.`;
                  break;
                case "unReport":
                  successMsg = `${userId}를 신고 해제했습니다.`;
                  break;
                default:
                  break;
              }
              modalStore.openModal("oneBtn", {
                message: successMsg,
                onConfirm: async () => {
                  await modalStore.closeModal();
                },
              });
              // 매칭 히스토리 정보를 갱신합니다.
              await fetchHistory();
            }
          } catch (error) {
            console.error("서버 요청 실패:", error);
          }
        },
      });
    } catch (error) {
      console.error("모달 열기 실패:", error);
    }
    setActivePopOver(null);
  };

  // ✅ 신고 , 차단 위치 모호해서 주석주석
  const banOrReport = (user) => {
    if (user.ban && user.report) {
      return (
        <span className="ml-2 px-1.5 py-0.5 bg-[#FFACAC] text-[#E62222] rounded-md whitespace-nowrap">
          차단 및 신고 유저
        </span>
      );
    } else if (user.ban) {
      return (
        <span className="ml-2 px-1.5 py-0.5 bg-[#FFACAC] text-[#E62222] rounded-md whitespace-nowrap">
          차단 유저
        </span>
      );
    } else if (user.report) {
      return (
        <span className="ml-2 px-1.5 py-0.5 bg-[#FFACAC] text-[#E62222] rounded-md whitespace-nowrap">
          신고 유저
        </span>
      );
    }
    return null;
  };

  // 매칭 횟수별 메달 표시 함수
  const viewMedal = (count) => {
    if (count >= 5) return <GoldMedal width="16px" height="16px" />;
    if (count >= 3) return <SilverMedal width="16px" height="16px" />;
    if (count >= 1) return <BronzeMedal width="16px" height="16px" />;
    return null;
  };

  // 리뷰 작성 페이지로 이동
  const writeReview = (restsId, restsName, matching) => {
    navigate(`/rests/write/${restsId}`, {
      state: {
        restId: `${restsId}`,
        restName: `${restsName}`,
        matching: `${matching}`,
      },
    });
  };

  const myReviewChk = async (thisID) => {
    try {
      const matchingHistoryId = thisID;
      const token = window.localStorage.getItem("token");

      const response = await axios.get(
        `${import.meta.env.VITE_BE_API_URL}/restaurants/myreview?matchingHistoryId=${matchingHistoryId}`,
        {
          params: {
            matchingHistoryId: matchingHistoryId  // 쿼리 파라미터 설정
          },
          headers: {
            "Content-Type": "application/json", // Content-Type 설정
            Authorization: `Bearer ${token}` // Authorization 설정
          },
        }
      );

      if (response.status === 200) {
        const reviewData = response.data;
        modalStore.openModal("oneBtn", {
          message: <RestReviewItem review={reviewData}/>, // 모달 메시지 설정
          onConfirm: async () => {
            await modalStore.closeModal();
          },
        });
      }
    } catch (error) {
      console.error("Error fetching review:", error);
      modalStore.openModal("oneBtn", {
        message: "리뷰를 불러오는 데 실패했습니다.",
        onConfirm: async () => {
          await modalStore.closeModal();
        },
      });
    }
  };

  console.log(Object.values(historyData))
  return (
    <div className="h-[inherit] flex flex-col basis-full gap-10 border md:flex-1 border-[#ff6445] bg-white drop-shadow-lg rounded-2xl px-7 py-7">
      <p className="font-bold text-[28px] text-left">나의 매칭 히스토리</p>
      <ul className="flex flex-col flex-1 gap-4 overflow-y-scroll scrollbar-hide">
        {Object.values(historyData) ? (
          Object.values(historyData).map((item) => (
            <li key={item.id} className="flex flex-col gap-4 rounded-2xl">
              <div className="flex justify-between items-center">
                <div className="flex flex-shrink-0 items-end">
                  <span>{item.matching.restaurant.name}</span>
                  <span className="text-xs text-gray-400 pl-2">
                    {item.matching.restaurant.category_name}
                  </span>
                </div>
                <span>
                  {!item.matching.userList.find(user => user.id === item.userId)?.review?.description?.trim() ? (
                    <div
                      onClick={() =>
                        writeReview(
                          item.id,
                          item.matching.restaurant.name,
                          item.matching
                        )
                      }
                      className="flex flex-shrink-0 text-sm text-[#909090] border border-[#909090] px-1.5 rounded-md cursor-pointer"
                    >
                      리뷰 작성하기
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => myReviewChk(item.id)}
                        className="flex flex-shrink-0 text-sm text-[#909090] border border-[#909090] px-1.5 rounded-md cursor-pointer">
                        리뷰 확인하기
                      </div>
                    </>
                  )}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {item.matching.userList.map((user, idx) => (
                  <li
                    key={idx}
                    className="relative flex text-sm justify-between items-center bg-[#F8F8F8] p-3 rounded-lg"
                  >
                    <div className="w-full flex flex-col gap-1">
                      <div className="flex gap-0.5">
                        <p className="whitespace-nowrap">{user.nickname}</p>
                        <div className="flex flex-1 flex-shrink-0 items-center">
                          {viewMedal(user.matchingCount)}
                          {banOrReport(user)}
                        </div>
                      </div>
                      <div className="text-left text-[#555555]">
                        {user?.review?.description}
                      </div>
                    </div>
                    <div>
                      {item.userId !== user.id && (
                        <p
                          className="font-bold rotate-90 tracking-[-0.15rem] cursor-pointer"
                          onClick={() => popOver(user.id, item.id)}
                        >
                          ···
                        </p>
                      )}
                      {activePopOver === `${user.id}-${item.id}` && (
                        <div
                          ref={popOverRef}
                          className="absolute flex flex-col gap-1 z-50 top-10 right-1 bg-white p-2 border border-gray-300 rounded-lg"
                        >
                          {user.ban ? (
                            <button
                              onClick={() => toggleModal("unBan", user.id)}
                              className="py-1 px-2 rounded-lg hover:bg-gray-200"
                            >
                              차단해제
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleModal("ban", user.id)}
                              className="py-1 px-2 rounded-lg hover:bg-gray-200"
                            >
                              차단하기
                            </button>
                          )}
                          {user.report ? (
                            <button
                              onClick={() => toggleModal("unReport", user.id)}
                              className="py-1 px-2 rounded-lg hover:bg-gray-200"
                            >
                              신고해제
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleModal("report", user.id)}
                              className="py-1 px-2 rounded-lg hover:bg-gray-200"
                            >
                              신고하기
                            </button>
                          )}
                          <div className="absolute -top-1.5 right-3 rotate-45 w-2.5 h-2.5 bg-white border-l border-t border-gray-300"></div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))
        ) : (
          <div className="text-2xl text-gray-500">
            매칭 히스토리가 없습니다.
          </div>
        )}
        {page !== totalPage && hasMore && (
          <div ref={moreHistory} className="relative pb-8 w-full h-8">
           더 보기
          </div>
        )}
        {isLoading && (
          <div className="relative h-30 w-full">
            <ReactLoading
              type={"spokes"}
              color={"#000000"}
              height={25}
              width={25}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        )}
      </ul>
    </div>
  );
});

export default RestReviews;
