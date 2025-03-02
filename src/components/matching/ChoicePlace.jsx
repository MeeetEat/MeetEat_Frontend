import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StaticMap } from "react-kakao-maps-sdk";
import { createBrowserHistory } from "history";
import authStore from "../../store/authStore";
import matchingStore from "../../store/matchingStore";
import CheckTitle from "../../assets/check-title.svg?react";

export default function CheckPlace() {
  // 로그인, 매칭 확인
  useLayoutEffect(() => {
    authStore.checkLoggedIn();
    matchingStore.checkCompleted();

    if (!authStore.loggedIn) {
      alert("로그인 후 이용해주세요 :)");
      navigate("/");
    }
    // 유저가 매칭된 상태가 아니라면 메인페이지로 이동
    if (!matchingStore.isCompleted) {
      alert("잘못된 접근입니다.");
      return navigate("/");
    }
    // 매칭 정보가 없으면 메인 페이지로 이동
    if (window.sessionStorage.getItem("matchingData") === null) {
      return navigate("/");
    }
    // 저장된 매칭데이터 저장
    const jsonData = JSON.parse(window.sessionStorage.getItem("matchingData"));
    const jsonCurData = JSON.parse(
      window.sessionStorage.getItem("matchedData"),
    );
    setMatchingData(jsonData.restaurantList);
    setPickedPlace(jsonCurData.matching.restaurant.name);
  }, []);

  // 뒤로가기 발생시 메인으로 이동
  const history = createBrowserHistory();
  const { pathname } = useLocation();
  useEffect(() => {
    const unlistenHistoryEvent = history.listen(({ action }) => {
      console.log(pathname);
      if (action !== "POP") return;
      else {
        location.replace("/");
      }
    });
    return unlistenHistoryEvent;
  }, []);

  // 새로고침 발생시 메인으로 이동
  useEffect(() => {
    window.addEventListener("unload", (e) => {
      console.log(e);
      window.location.replace("/");
    });
  }, []);
  useEffect(() => {
    window.addEventListener("beforeunload", (e) => {
      console.log(e);
      e.preventDefault();
    });
  }, []);
  useEffect(() => {
    if (window.sessionStorage.getItem("firstLoadDone") === null) {
      console.log("첫 로드");
      window.sessionStorage.setItem("firstLoadDone", "1");
    } else {
      console.log("리로드");
      window.sessionStorage.removeItem("firstLoadDone");
      window.location.replace("/");
    }
  }, []);

  const navigate = useNavigate();

  const position = JSON.parse(window.sessionStorage.getItem("tempPosition"));
  const [matchingData, setMatchingData] = useState([]);
  const [pickedPlace, setPickedPlace] = useState();

  // 타이머
  const MINUTES_IN_MS = 1 * 5 * 1000;
  const INTERVAL = 1000;
  const [timeLeft, setTimeLeft] = useState(MINUTES_IN_MS);
  const second = String(Math.floor((timeLeft / 1000) % 60));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - INTERVAL);
    }, INTERVAL);

    if (timeLeft <= 0) {
      // 타이머 종료시 최종 매칭 완료 페이지 이동
      clearInterval(timer);
      console.log("타이머가 종료되었습니다.");
      window.sessionStorage.removeItem("matchingData");
      window.sessionStorage.removeItem("tempPosition");
      const id = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matchingHistoryId;
      window.sessionStorage.removeItem("firstLoadDone");
      navigate(`/matching/complete/${id}`);
    }

    return () => {
      clearInterval(timer);
    };
  }, [timeLeft]);

  useEffect(() => {
    let choicedIdx = 0;
    const placeList = document.querySelectorAll(".place-name").values();
    [...placeList].map((item, idx) => {
      if (item.innerText === pickedPlace) choicedIdx = idx;
    });
    console.log(`pick-border-${matchingData.length}-${choicedIdx}`);
    document
      .querySelector(".pick-border")
      .classList.add(`pick-border-${matchingData.length}-${choicedIdx}`);
  }, [matchingData]);

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

  return (
    <>
      <div className="bg-map relative h-full w-full">
        <div className="absolute z-10 h-full w-full bg-black/40"></div>
        {position && (
          <StaticMap
            id="map"
            className="h-full w-full"
            center={JSON.parse(window.sessionStorage.getItem("tempPosition"))}
            level={5}
          />
        )}
      </div>
      <div className="absolute left-1/2 top-1/2 z-20 flex h-[412px] w-[350px] -translate-x-1/2 -translate-y-1/2 transform flex-col items-center rounded-lg bg-white py-[40px] drop-shadow-2xl will-change-transform md:w-[790px]">
        <div className="flex flex-col items-center">
          <CheckTitle />
          <p className="pb-1 pt-[30px] text-base font-semibold md:text-xl">
            방문할 음식점을 선택하는 중이에요.
          </p>
          <p className="pb-3 text-base font-semibold md:text-xl">
            {second}초 뒤에 음식점이 공개됩니다!
          </p>
        </div>
        <div className="people-container relative flex h-[200px] w-[340px] flex-col justify-center gap-4 rounded-lg bg-[#F8F8F8] py-3 text-[14px] text-[#555555] md:w-[700px]">
          {matchingData.map((item) => (
            <>
              <div className="people-info grid w-[340px] grid-cols-[113px_113px_113px] justify-center md:w-[700px] md:grid-cols-[200px_200px_200px]">
                <p className="place-name text-overflow">{item.place.name}</p>
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
          <div className="pick-border absolute left-1/2 top-[68px] h-[35px] w-[340px] -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-[#FF6445] md:w-[650px]"></div>
        </div>
      </div>
    </>
  );
}
