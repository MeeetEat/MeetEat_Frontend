import React, { useEffect, useLayoutEffect, useState } from "react";
import { Map, MapMarker, Polyline } from "react-kakao-maps-sdk";
import { useNavigate } from "react-router-dom";
import useInterval from "../hooks/useInterval";
import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";
import matchingStore from "../../store/matchingStore";
import modalStore from "../../store/modalStore.js";

export default function MatchingComplete() {
  // 현재 위치
  const [position, setPosition] = useState({
    lat: 37.503081,
    lng: 127.05,
  });

  // 도착 위치
  const [positionTo, setPositionTo] = useState({
    lat: 37.503081,
    lng: 127.05,
  });

  const navigate = useNavigate();
  const [userList, setUserList] = useState([]);
  const [pickedRest, setPickedRest] = useState([]);
  const [date, setDate] = useState("");
  const [distance, setDistance] = useState("");

  // 초기 설정
  useLayoutEffect(() => {
    // 유저가 매칭된 상태가 아니라면 메인페이지로 이동
    if (window.sessionStorage.getItem("isCompleted") !== "true") {
      alert("잘못된 접근입니다.");
      console.log("매칭완료된 상태가 아닙니다.");
      return navigate("/");
    }
    if (window.sessionStorage.getItem("matchedData") === undefined) {
      alert("잘못된 접근입니다.");
      console.log("매칭완료된 데이터가 없습니다.");
      return navigate("/");
    }
    // apiSSESub();
    const now = new Date(); // 오늘 날짜
    // const firstDay = new Date(
    //   JSON.parse(window.sessionStorage.getItem("matchedData")).createdAt
    // ); // 시작 날짜
    const firstDay = new Date(
      JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matching.createdAt.slice(
        0,
        JSON.parse(
          window.sessionStorage.getItem("matchedData"),
        ).matching.createdAt.indexOf("."),
      ),
    ); // 시작 날짜
    console.log("firstDay");
    console.log(firstDay);
    const toNow = now.getTime(); // 오늘까지 지난 시간(밀리 초)
    const toFirst = firstDay.getTime(); // 첫날까지 지난 시간(밀리 초)
    const passedTimeMin = (Number(toNow) - Number(toFirst)) / 60000; // 첫날부터 오늘까지 지난 시간(밀리 초)
    if (passedTimeMin >= 5) {
      const restsId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.id;
      const restsName = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.name;
      const matchedId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.id;
      const matchingHistoryId = JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matchingHistoryId;
      return navigate(`/rests/write/${matchingHistoryId}`, {
        state: {
          restId: `${restsId}`,
          restName: `${restsName}`,
          matchedId: `${matchedId}`,
          matchingHistoryId: `${matchingHistoryId}`,
        },
      });
    }
    // const goReviewPage = () => {
    //   const restsId = JSON.parse(window.sessionStorage.getItem("matchedData"))
    //     .matching.restaurant.id;
    //   const restsName = JSON.parse(window.sessionStorage.getItem("matchedData"))
    //     .matching.restaurant.placeName;
    //   const matchedId = JSON.parse(window.sessionStorage.getItem("matchedData"))
    //     .matching.id;
    //   return navigate(`/rests/write/${restsId}`, {
    //     state: {
    //       restId: `${restsId}`,
    //       restName: `${restsName}`,
    //       matchedId: `${matchedId}`,
    //     },
    //   });
    // };

    // // 매칭 완료된 이후 60분 경과 후에는 리뷰페이지로 이동
    // let timer = setTimeout(() => {
    //   goReviewPage;
    // }, [360000]);

    // // 매칭 완료된 이후 60분 경과 후에는 리뷰페이지로 이동
    // if (passedTimeMin >= 60) {
    //   clearTimeout(timer);
    //   goReviewPage();
    // }

    // 저장된 매칭데이터 저장
    const jsonCurData = JSON.parse(
      window.sessionStorage.getItem("matchedData"),
    );
    setDate(jsonCurData.matching.createdAt);
    setUserList(jsonCurData.matching.userList);
    setPickedRest(jsonCurData.matching.restaurant);
    setPositionTo({
      lat: jsonCurData.matching.restaurant.lat,
      lng: jsonCurData.matching.restaurant.lon,
    });
    window.sessionStorage.setItem(
      "tempUser",
      JSON.stringify(
        jsonCurData.matching.userList.filter((item) => item.join === true),
      ),
    );
    // 매칭 취소 발생
    //   setTimeout(
    //     () =>
    //       axios
    //         .get(`${import.meta.env.VITE_BE_API_URL}/matching/complete`)
    //         .then(() => {
    //           alert("매칭 이탈자가 발생하여 매칭을 종료합니다.");
    //           window.sessionStorage.clear();
    //           navigate("/");
    //         })
    //         .catch(function (error) {
    //           console.log(error);
    //         }),
    //     [10000]
    //   );
  }, []);

  useEffect(() => {
    // SSE fetch
    const fetchSSE = () => {
      // header 보내기 위해 EventSourcePolyfill 사용
      const eventSource = new EventSourcePolyfill(
        `${import.meta.env.VITE_BE_API_URL}/sse/subscribe`,
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          heartbeatTimeout: 60 * 60 * 1000,
          withCredentials: true,
        },
      );
      eventSource.onopen = () => {
        // 연결시 할 일
      };

      eventSource.addEventListener("cancel", (e) => {
        console.log("3분전 취소");
        console.log(e.data);
        modalStore.openModal("oneBtn", {
          message: (
            <>
              <p>매칭 이탈자가 발생하여 매칭을 종료합니다.</p>
            </>
          ),
          onConfirm: async () => {
            await navigate("/mypage");
            window.sessionStorage.clear();
            matchingStore.setIsCompleted(false);
            matchingStore.setIsMatched(false);
            eventSource.close();
            window.location.replace("/");
            modalStore.closeModal();
          },
        });
      });
      eventSource.addEventListener("escape", (e) => {
        console.log("3분후 취소");
        console.log("e.data : " + e.data);

        const tempUser = [
          ...JSON.parse(window.sessionStorage.getItem("tempUser")),
        ].filter((item) => {
          console.log(item);
          return item.id !== Number(e.data);
        });

        console.log("tempUser");
        console.log(tempUser);
        window.sessionStorage.setItem("tempUser", JSON.stringify(tempUser));
        setUserList(tempUser);
      });

      eventSource.onerror = (e) => {
        // 종료 또는 에러 발생 시 할 일
        eventSource.close();
        if (e.error) {
          // 에러 발생 시 할 일
        }
        if (e.target.readyState === EventSource.CLOSED) {
          // 종료 시 할 일
        }
      };
    };
    fetchSSE();
  }, []);

  const getPassedTime = () => {
    console.log("getPassedTime 실행");
    const now = new Date(); // 오늘 날짜
    const firstDay = new Date(
      JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matching.createdAt.slice(
        0,
        JSON.parse(
          window.sessionStorage.getItem("matchedData"),
        ).matching.createdAt.indexOf("."),
      ),
    ); // 시작 날짜
    const toNow = now.getTime(); // 오늘까지 지난 시간(밀리 초)
    const toFirst = firstDay.getTime(); // 첫날까지 지난 시간(밀리 초)
    const passedTimeMin = (Number(toNow) - Number(toFirst)) / 60000; // 첫날부터 오늘까지 지난 시간(밀리 초)
    if (passedTimeMin >= 50) {
      const restsId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.id;
      const restsName = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.name;
      const matchedId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.id;
      const matchingHistoryId = JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matchingHistoryId;
      return navigate(`/rests/write/${matchingHistoryId}`, {
        state: {
          restId: `${restsId}`,
          restName: `${restsName}`,
          matchedId: `${matchedId}`,
          matchingHistoryId: `${matchingHistoryId}`,
        },
      });
    }
  };
  // 60초마다 반복실행
  useInterval(() => {
    getPassedTime();
  }, 60000);

  // 거리계산
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

  // 선 Path
  const [polyPath, setPolyPath] = useState([{}]);

  // 지도가 처음 렌더링되면 중심좌표를 현위치로 설정하고 위치 변화 감지
  const gpsError = (err) => {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  };

  const geolocationOptions = {
    enableHighAccuracy: true,
    maximumAge: 5 * 60 * 1000,
    timeout: 7000,
  };

  // geolocation API
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (
          pos.coords.latitude !== position.lat ||
          pos.coords.longitude !== position.lng
        ) {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      gpsError,
      geolocationOptions,
    );

    navigator.geolocation.watchPosition(
      (pos) => {
        if (
          pos.coords.latitude !== position.lat ||
          pos.coords.longitude !== position.lng
        ) {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      gpsError,
      geolocationOptions,
    );
  }, []);

  // 카카오 모빌리티 API
  useEffect(() => {
    const origin = `${position.lng},${position.lat}`;
    const destination = `${positionTo.lng},${positionTo.lat}`;

    axios
      .get(`https://apis-navi.kakaomobility.com/v1/directions?`, {
        params: {
          origin: origin,
          destination: destination,
        },
        headers: {
          Authorization: `KakaoAK ${import.meta.env.VITE_APP_KAKAO_REST_KEY}`,
        },
      })
      .then((response) => {
        setPolyPath([]);
        response.data.routes[0].sections[0].roads.forEach((road) => {
          road.vertexes.forEach((vertex, index) => {
            if (index % 2 === 0) {
              setPolyPath((prev) => [
                ...prev,
                {
                  lat: road.vertexes[index + 1],
                  lng: vertex,
                },
              ]);
            }
          });
        });
        console.log(polyPath);
      });

    const distance = getDistance(
      position.lat,
      position.lng,
      positionTo.lat,
      positionTo.lng,
    );
    setDistance(distance);
  }, [position, positionTo]);

  // 3분 전 매칭취소
  async function apiPOSTCancel(matchingId) {
    await axios
      .post(
        `${import.meta.env.VITE_BE_API_URL}/matching/${matchingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      )
      .then(() => {
        window.sessionStorage.removeItem("isMatched");
        window.sessionStorage.removeItem("isCompleted");
        window.sessionStorage.removeItem("matchedData");
        matchingStore.setIsCompleted(false);
        matchingStore.setIsMatched(false);
        navigate("/");
      })
      .catch((err) => {
        console.log(err);
      });
  }
  // 3분 후 매칭취소
  async function apiPOSTCancelIllegal(matchingId) {
    await axios
      .post(
        `${import.meta.env.VITE_BE_API_URL}/matching/${matchingId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      )
      .then(() => {
        navigate("/");
        window.sessionStorage.removeItem("isMatched");
        window.sessionStorage.removeItem("isCompleted");
        window.sessionStorage.removeItem("matchedData");
        matchingStore.setIsCompleted(false);
        matchingStore.setIsMatched(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  const cancelMatched = () => {
    const now = new Date();
    const firstDay = new Date(
      JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matching.createdAt.slice(
        0,
        JSON.parse(
          window.sessionStorage.getItem("matchedData"),
        ).matching.createdAt.indexOf("."),
      ),
    );
    const toNow = now.getTime();
    const toFirst = firstDay.getTime();
    const passedTimeMin = (Number(toNow) - Number(toFirst)) / 60000;
    console.log(passedTimeMin + "min");
    if (passedTimeMin >= 3) {
      alert("매칭 3분 이후 취소로 패널티가 부과됩니다.");
      return apiPOSTCancelIllegal(
        JSON.parse(window.sessionStorage.getItem("matchedData")).matching.id,
      );
    }
    alert("매칭 3분 이전 취소로 패널티가 부과되지 않습니다.");
    return apiPOSTCancel(
      JSON.parse(window.sessionStorage.getItem("matchedData")).matching.id,
    );
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  function handleClickOutside(e) {
    const modalBox = document.getElementById("modalBg");
    if (isModalOpen && modalBox === e.target) {
      setIsModalOpen(false);
    }
  }
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <>
      <div className="bg-map relative h-full w-full">
        <div className="absolute z-10 h-full w-full bg-black/40"></div>
        <Map id="map" className="h-full w-full" center={position} level={5} />
      </div>
      <div className="absolute left-1/2 top-1/2 z-20 flex h-[600px] w-[350px] -translate-x-1/2 -translate-y-1/2 transform flex-col place-items-center gap-5 rounded-lg bg-white py-[40px] drop-shadow-2xl md:h-[520px] md:w-[790px]">
        <div className="title-container flex flex-col text-base font-semibold md:text-xl">
          <h1>{pickedRest.name}에서</h1>
          <h1>
            한시간 뒤 {Number(date.slice(11, 13)) + 1}시 {date.slice(14, 16)}
            분에 만나요 !
          </h1>
          <div className="pt-2 text-sm font-normal md:text-base">
            {pickedRest.road_address_name}까지 내 위치에서 {distance}분
          </div>
        </div>
        <div className="center-container flex max-w-[340px] flex-col justify-center gap-5 md:h-[300px] md:w-full md:flex-row md:gap-10">
          <Map
            className="map-container min-h-[200px] md:h-full md:min-w-[300px]"
            id="map"
            center={position}
            level={5}
          >
            <MapMarker
              image={{
                src: "/assets/map-pin.svg",
                size: { width: 20, height: 20 },
              }}
              position={position}
            />
            <MapMarker
              image={{
                src: "/assets/positionTo.svg",
                size: { width: 20, height: 20 },
              }}
              position={positionTo}
            />
            <Polyline
              path={polyPath}
              strokeWeight={5} // 선의 두께 입니다
              strokeColor={"#00900a"} // 선의 색깔입니다
              strokeOpacity={0.7} // 선의 불투명도 입니다 1에서 0 사이의 값이며 0에 가까울수록 투명합니다
              strokeStyle={"solid"} // 선의 스타일입니다
            />
          </Map>
          <div className="people-container flex h-[180px] min-w-[340px] flex-col gap-2 overflow-y-scroll scrollbar-hide md:h-full md:min-w-[370px]">
            {userList.map(
              (user) =>
                user.join === true && (
                  <>
                    <div className="people-item rounded-lg border border-slate-200 p-3 text-left">
                      <div className="flex flex-row">
                        <p>{user.nickname}</p>
                      </div>
                      <p>{user.introduce}</p>
                    </div>
                  </>
                ),
            )}
          </div>
        </div>
        <div className="fixed bottom-0 z-50 flex h-[60px] w-full max-w-3xl flex-row justify-center text-[#555555]">
          <button onClick={() => setIsModalOpen(true)}>
            매칭을 취소하시겠습니까?
          </button>
        </div>
      </div>
      {isModalOpen && (
        <>
          <div className="absolute z-50 h-full w-full">
            <div
              id={"modalBg"}
              className="absolute left-0 top-0 z-10 h-full w-full bg-black/30"
            ></div>
          </div>
          <div className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 transform drop-shadow-lg">
            <div className="w-[300px] rounded-lg bg-white p-4 text-left md:w-[420px] md:p-7">
              <p className="max-w-[420px] text-center text-[15px] font-bold md:text-[18px]">
                매칭 취소시 패널티가 부과될 수 있습니다.
              </p>
              <p className="max-w-[420px] pb-5 text-center text-[15px] font-bold md:text-[18px]">
                매칭을 취소하시겠습니까?
              </p>
              <p className="max-w-[200px] text-sm font-semibold md:text-base">
                매칭 완료 3분 이내 취소
              </p>
              <p className="max-w-[200px] pb-2 text-xs md:text-sm">
                → 패널티 없음
              </p>
              <p className="max-w-[200px] text-sm font-semibold md:text-base">
                매칭 완료 3분 이후 취소
              </p>
              <p className="max-w-[200px] text-xs md:text-sm">
                → 일주일간 매칭 불가
              </p>
              <div className="flex flex-row justify-center gap-24 pt-6 text-sm md:text-base">
                <button onClick={() => setIsModalOpen(false)}>아니오</button>
                <button onClick={cancelMatched}>네</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
