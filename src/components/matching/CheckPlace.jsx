import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { callApi } from "../hooks/useAxios";
import { useNavigate } from "react-router-dom";
import { StaticMap } from "react-kakao-maps-sdk";
import CheckTitle from "../../assets/check-title.svg?react";
import Waiting from "../../assets/waiting.svg?react";
import Check from "../../assets/check.svg?react";
import modalStore from "../../store/modalStore.js";
import authStore from "../../store/authStore";
import matchingStore from "../../store/matchingStore";
import { EventSourcePolyfill } from "event-source-polyfill";

export default function CheckPlace() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState("");
  const position = JSON.parse(window.sessionStorage.getItem("tempPosition"));
  const [matchingData, setMatchingData] = useState([]);
  const [user, setUser] = useState(new Map());

  useEffect(() => {
    authStore.checkLoggedIn();
    matchingStore.checkMatching();
    matchingStore.checkMatched();

    // 유저가 매칭된 상태가 아니라면 메인페이지로 이동
    if (!window.sessionStorage.getItem("matchingData")) {
      return navigate("/");
    }
    if (!matchingStore.isMatched) {
      if (matchingStore.isMatching) {
        window.sessionStorage.removeItem("isMatching");
        matchingStore.checkMatching();
        return navigate("/");
      }
      return navigate("/");
    } else if (!matchingStore.isMatching) {
      alert("잘못된 접근입니다.");
      return navigate("/");
    } else if (!authStore.loggedIn) {
      alert("로그인 후 이용해주세요 :)");
      return navigate("/");
    }

    // Get Profile
    const apiGetProfile = async () => {
      const resProfile = await callApi("/users/profile", "GET");
      console.log(resProfile.data);
      if (resProfile.status === 200) {
        setProfile(resProfile.data);
      }
    };

    // SSE Fetch
    const fetchSSE = () => {
      // header 보내기 위해 EventSourcePolyfill 사용
      const eventSource = new EventSourcePolyfill(
        `${import.meta.env.VITE_BE_API_URL}/sse/subscribe`,
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },

          heartbeatTimeout: 1 * 60 * 1000,
          withCredentials: true,
        },
      );

      eventSource.onopen = () => {
        console.log("SSE 구독");
      };

      eventSource.addEventListener("Join", (e) => {
        console.log("Join Event 발생");
        console.log(JSON.parse(e.data));
        if (JSON.parse(e.data).user.join === false) {
          alert("매칭 인원 중 누군가가 거절하였습니다");
          window.sessionStorage.clear();
          return window.location.replace("/");
        }
        setUser((prev) => {
          const newState = new Map(prev);
          newState.set(JSON.parse(e.data).user.nickname, true);
          return newState;
        });
      });

      eventSource.addEventListener("Team", (e) => {
        console.log("Team Event 발생");
        console.log(JSON.parse(e.data));
        window.sessionStorage.setItem("matchedData", e.data);
        window.sessionStorage.removeItem("isMatching");
        window.sessionStorage.removeItem("isMatched");
        window.sessionStorage.setItem("isCompleted", "true");
        navigate(`/matching/choice-place/${JSON.parse(e.data).matchingHistoryId}`);
        eventSource.close();
      });

      // 종료 또는 에러 발생시 장소 거절 요청
      eventSource.onerror = (e) => {
        handleDisAgree();
        eventSource.close();
      };
    };
    apiGetProfile();
    fetchSSE();

    const jsonData = JSON.parse(window.sessionStorage.getItem("matchingData"));
    console.log(JSON.parse(window.sessionStorage.getItem("matchingData")));
    setMatchingData(jsonData.restaurantList);
  }, []);

  // 뒤로가기 방어
  history.pushState(null, null, "/"); // push

  const befoeunloadFunc = () => {
    e.preventDefault();
    e.returnValue = "";
  };
  useEffect(() => {
    // popstate 발생시 장소 거절 요청
    window.addEventListener("popstate", () => {
      window.sessionStorage.removeItem("tempPosition");
      window.sessionStorage.removeItem("isMatching");
      window.sessionStorage.removeItem("isMatched");
      window.sessionStorage.removeItem("matchingData");
      apiDisagree();
    });
    window.addEventListener("beforeunload", befoeunloadFunc);
    return window.removeEventListener("beforeunload", befoeunloadFunc);
  }, []);

  // unload 발생시 장소 거절 요청
  const unloadFunc = () => {
    window.sessionStorage.removeItem("tempPosition");
    window.sessionStorage.removeItem("isMatching");
    window.sessionStorage.removeItem("isMatched");
    window.sessionStorage.removeItem("matchingData");
    apiDisagree();
  };

  useEffect(() => {
    window.addEventListener("unload", unloadFunc);
    return window.addEventListener("unload", unloadFunc);
  }, []);

  const isMounted = useRef(false);
  useEffect(() => {
    if (isMounted.current) {
      matchingData.map((data) => {
        setUser((pre) => new Map([...pre, [data.user.nickname, false]]));
      });
    } else {
      isMounted.current = true;
    }
  }, [matchingData]);

  useEffect(() => {
    console.log(user);
    user.forEach((value, key) => {
      if (value === true) {
        console.log(key);
        console.log(`#${key}waiting`);
        console.log(document.querySelector(`#${key}waiting`));
        document.querySelector(`#${key}-waiting`).classList.add("hidden");
        document.querySelector(`#${key}-check`).classList.remove("hidden");
      }
    });
  }, [user]);

  // 거리계산 함수
  const getDistance = (lat1, lng1, lat2, lng2) => {
    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }

    let R = 6371; // Radius of the earth in km
    let dLat = deg2rad(lat2 - lat1); // deg2rad below
    let dLon = deg2rad(lng2 - lng1);
    let a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c;
    d = Math.round((d / 4.8) * 60);
    return d;
  };

  // 타이머
  const MINUTES_IN_MS = 1 * 60 * 1000;
  const INTERVAL = 1000;
  const [timeLeft, setTimeLeft] = useState(MINUTES_IN_MS);

  const minutes = String(Math.floor((timeLeft / (1000 * 60)) % 60)).padStart(
    2,
    "0",
  );
  const second = String(Math.floor((timeLeft / 1000) % 60)).padStart(2, "0");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - INTERVAL);
    }, INTERVAL);

    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("선택 시간이 초과되어 매칭이 종료됩니다");
      window.sessionStorage.removeItem("tempPosition");
      window.sessionStorage.removeItem("isMatching");
      window.sessionStorage.removeItem("isMatched");
      window.sessionStorage.removeItem("matchingData");
      navigate("/");
      modalStore.isOpen && modalStore.closeModal();
    }

    return () => {
      clearInterval(timer);
    };
  }, [timeLeft]);

  // 장소 동의
  const handleAgree = () => {
    apiAgree();
  };
  const apiAgree = async () => {
    const resPostCancel = await callApi("/matching/join", "POST", {
      teamId: JSON.parse(window.sessionStorage.getItem("matchingData")).teamId,
      join: true,
    });
    if (resPostCancel.status === 200) {
      document
        .querySelector(`#${profile.nickname}-waiting`)
        .classList.add("hidden");
      document
        .querySelector(`#${profile.nickname}-check`)
        .classList.remove("hidden");
      document.querySelector(`#agreeBtn`).classList.add("hidden");
      setUser((prev) => {
        const newState = new Map(prev);
        newState.set(profile.nickname, true);
        return newState;
      });
    }
  };

  // 장소 거절
  const handleDisAgree = () => {
    modalStore.openModal("twoBtn", {
      message: "매칭을 거절 하시겠습니까?",
      onConfirm: () => {
        apiDisagree();
        modalStore.closeModal();
      },
    });
  };
  const apiDisagree = async () => {
    const resPostCancel = await callApi("/matching/join", "POST", {
      teamId: JSON.parse(window.sessionStorage.getItem("matchingData")).teamId,
      join: false,
    });
    if (resPostCancel.status === 200) {
      window.sessionStorage.removeItem("tempPosition");
      window.sessionStorage.removeItem("isMatching");
      window.sessionStorage.removeItem("isMatched");
      window.sessionStorage.removeItem("matchingData");
      matchingStore.setIsMatched(false);
      matchingStore.setIsMatching(false);
      window.location.replace("/");
    }
  };

  // async function apiGetU2() {
  //   setTimeout(() => {
  //     console.log("3초 지남");
  //     axios
  //       .get(`${import.meta.env.VITE_BE_API_URL}/matching/nickname2`, {
  //         headers: {
  //           Authorization: `${window.localStorage.getItem("token")}`,
  //           "Content-Type": "application/json",
  //         },
  //       })
  //       .then((res) => {
  //         if (res.data.user.join === false) {
  //           alert("매칭 인원 중 누군가가 거절하였습니다");
  //           window.sessionStorage.clear();
  //           return navigate("/");
  //         }
  //         setUser((prev) => {
  //           const newState = new Map(prev);
  //           newState.set(res.data.user.nickname, true);
  //           return newState;
  //         });
  //       })
  //       .catch(function (error) {
  //         console.log(error);
  //       });
  //   }, [3000]);
  // }

  // async function apiGetU3() {
  //   setTimeout(() => {
  //     console.log("9초 지남");
  //     axios
  //       .get(`${import.meta.env.VITE_BE_API_URL}/matching/nickname3`, {
  //         headers: {
  //           Authorization: `${window.localStorage.getItem("token")}`,
  //           "Content-Type": "application/json",
  //         },
  //       })
  //       .then((res) => {
  //         if (res.data.user.join === false) {
  //           alert("매칭 인원 중 누군가가 거절하였습니다");
  //           window.sessionStorage.clear();
  //           return navigate("/");
  //         }
  //         setUser((prev) => {
  //           const newState = new Map(prev);
  //           newState.set(res.data.user.nickname, true);
  //           return newState;
  //         });
  //       })
  //       .catch(function (error) {
  //         console.log(error);
  //       });
  //   }, [9000]);
  // }

  // async function apiGetU4() {
  //   setTimeout(() => {
  //     console.log("7초 지남");
  //     axios
  //       .get(`${import.meta.env.VITE_BE_API_URL}/matching/nickname4`, {
  //         headers: {
  //           Authorization: `${window.localStorage.getItem("token")}`,
  //           "Content-Type": "application/json",
  //         },
  //       })
  //       .then((res) => {
  //         if (res.data.user.join === false) {
  //           alert("매칭 인원 중 누군가가 거절하였습니다");
  //           window.sessionStorage.clear();
  //           return navigate("/");
  //         }
  //         setUser((prev) => {
  //           const newState = new Map(prev);
  //           newState.set(res.data.user.nickname, true);
  //           return newState;
  //         });
  //       })
  //       .catch(function (error) {
  //         console.log(error);
  //       });
  //   }, [7000]);
  // }

  // async function apiPOSTCancel() {
  //   await axios
  //     .post(
  //       `${import.meta.env.VITE_BE_API_URL}/matching/cancel`,
  //       {},
  //       {
  //         headers: {
  //           Authorization: `Bearer ${window.localStorage.getItem("token")}`,
  //           "Content-Type": "application/json",
  //         },
  //       },
  //     )
  //     .then((res) => {
  //       console.log(res);
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // }

  // async function apiCompleted() {
  //   axios
  //     .get(`${import.meta.env.VITE_BE_API_URL}/matching/completed`, {
  //       headers: {
  //         Authorization: `${window.localStorage.getItem("token")}`,
  //         "Content-Type": "application/json",
  //       },
  //     })
  //     .then((res) => {
  //       window.sessionStorage.setItem("matchedData", JSON.stringify(res));
  //       window.sessionStorage.removeItem("isMatching");
  //       window.sessionStorage.removeItem("isMatched");
  //       window.sessionStorage.setItem("isCompleted", "true");
  //       navigate(`/matching/choice-place/${res.data.id}`);
  //     })
  //     .catch(function (error) {
  //       console.log(error);
  //     });
  // }

  ///////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////

  return (
    <>
      <div className="bg-map relative h-full w-full">
        <div className="absolute z-10 h-full w-full bg-black/40"></div>
        {position && (
          <StaticMap
            id="map"
            className="h-full w-full"
            center={position}
            level={5}
          />
        )}
      </div>
      <div className="absolute left-1/2 top-1/2 z-20 flex h-[525px] w-[350px] -translate-x-1/2 -translate-y-1/2 transform flex-col items-center rounded-lg bg-white py-[40px] drop-shadow-2xl md:w-[790px]">
        <div className="flex flex-col items-center">
          <CheckTitle />
          <p className="pb-1 pt-[30px] text-base font-semibold md:text-xl">
            매칭 인원을 찾았어요.
          </p>
          <p className="pb-3 text-base font-semibold md:text-xl">
            모든 인원 동의시 매칭이 계속 진행됩니다.
          </p>
          <p className="pb-5 text-sm md:text-base">
            남은시간 {minutes}:{second}
          </p>
        </div>
        <div className="people-container flex h-[200px] w-[340px] flex-col justify-center gap-6 rounded-lg bg-[#F8F8F8] py-3 text-xs text-[#555555] md:w-[700px] md:gap-4 md:text-[14px]">
          {matchingData.map((item, idx) => (
            <>
              <div
                key={idx}
                className="people-info grid h-[15px] w-[700px] grid-cols-[40px_75px_75px_75px_75px] justify-items-center md:grid-cols-[100px_150px_150px_150px_150px]"
              >
                <Waiting
                  id={`${item.user.nickname}-waiting`}
                  width="25px"
                  className="waiting w-[20px] md:w-[25px]"
                />
                <Check
                  id={`${item.user.nickname}-check`}
                  width="25px"
                  className="check hidden w-[20px] text-[#FF6445] md:w-[25px]"
                />
                <p className="text-overflow">{item.user.nickname}</p>
                <p className="text-overflow">{item.place.name}</p>
                <p className="text-overflow">
                  {item.place.category_name.slice(
                    item.place.category_name.lastIndexOf(">") + 2,
                  )}
                </p>
                <p>
                  {getDistance(
                    item.place.lat,
                    item.place.lon,
                    position.lat,
                    position.lng,
                  )}
                  분 소요
                </p>
              </div>
            </>
          ))}
        </div>
        <div className="check-container flex flex-col justify-center">
          <button
            id={"agreeBtn"}
            onClick={handleAgree}
            className="mb-3 mt-6 w-[200px] rounded-lg bg-[#A2A2A2] pb-[6px] pt-1 text-sm text-white hover:bg-[#FF6445] md:mt-4 md:text-[16px]"
          >
            모든 장소에 대해 동의
          </button>
        </div>
        <button
          onClick={handleDisAgree}
          className="absolute bottom-5 text-xs md:text-[14px]"
        >
          매칭취소
        </button>
      </div>
    </>
  );
}
