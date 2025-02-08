import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Map, MapMarker, Circle, CustomOverlayMap } from "react-kakao-maps-sdk";
import { debounce } from "lodash";
import axios from "axios";
import AccIcon from "../../assets/acc-icon.svg?react";
import HeaderLogo from "../../assets/header-logo.svg?react";
import SearchIcon from "../../assets/search.svg?react";
import ChatIcon from "../../assets/chat-line.svg?react";
import FoodIcon from "../../assets/food-line.svg?react";
import SearchList from "./SearchList";
import InfoWindow from "./InfoWindow";
import Matching from "./Matching";
import { useNavigate } from "react-router-dom";

export default function MainMatching() {
  const navigate = useNavigate();
  // 매칭중 확인
  const [isMatching, setIsMatching] = useState("false");
  const [isMatched, setIsMatched] = useState("false");

  useEffect(() => {
    window.sessionStorage.getItem("isMatching") !== null &&
      setIsMatching(window.sessionStorage.getItem("isMatching"));
    window.sessionStorage.getItem("isMatched") !== null &&
      setIsMatched(window.sessionStorage.getItem("isMatched"));

    // 매칭 완료된 상태인경우 매칭완료 페이지로 이동
    if (
      window.sessionStorage.getItem("isCompleted") === "true" &&
      window.sessionStorage.getItem("matchedData") !== undefined
    ) {
      const now = new Date(); // 오늘 날짜
      const firstDay = new Date(
        JSON.parse(window.sessionStorage.getItem("matchedData")).data.createdAt
      ); // 시작 날짜
      console.log(firstDay);
      const toNow = now.getTime(); // 오늘까지 지난 시간(밀리 초)
      const toFirst = firstDay.getTime(); // 첫날까지 지난 시간(밀리 초)
      const passedTimeMin = (Number(toNow) - Number(toFirst)) / 60000; // 첫날부터 오늘까지 지난 시간(밀리 초)
      console.log(passedTimeMin + "min");
      // 매칭 완료된 이후 60분 경과 후에는 리뷰페이지로 이동
      if (passedTimeMin >= 60) {
        const restsId = JSON.parse(window.sessionStorage.getItem("matchedData"))
          .data.matching.restaurant.id;
        return navigate(`/rests/write/${restsId}`);
      }
      const id = JSON.parse(window.sessionStorage.getItem("matchedData")).data
        .id;
      return navigate(`/matching/complete/${id}`);
    }
  }, [isMatching, isMatched]);

  // 브라우저 종료, 새로고침, 뒤로가기의 경우 매칭 취소 api 전송
  // sse의 경우 새로고침시 이전 메세지를 다시 받을 수 없음
  // 새로고침, 창닫기 방지
  const beforeunloadFunc = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };

  useEffect(() => {
    if (window.sessionStorage.getItem("isMatching") === "true") {
      window.addEventListener("beforeunload", beforeunloadFunc);
    }
    return () => {
      window.removeEventListener("beforeunload", beforeunloadFunc);
    };
  }, [isMatching]);

  async function apiPOSTCancel() {
    await axios
      .post("/matching/cancel", {})
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  //새로고침 확인을 눌렀을 경우 unload 이벤트 실행
  const unloadFunc = () => {
    setIsMatching("false");
    apiPOSTCancel();
  };
  //unload 이벤트
  window.addEventListener("unload", unloadFunc);

  // 지도의 중심좌표
  const [center, setCenter] = useState({
    lat: 37.503081,
    lng: 127.04158,
  });

  // 현재 위치
  const [position, setPosition] = useState({
    lat: 37.503081,
    lng: 127.04158,
  });

  // 지도의 중심을 유저의 현재 위치로 변경
  const setCenterToMyPosition = () => {
    setCenter(position);
  };

  // 지도 중심좌표 이동 감지 시 지도의 중심좌표를 이동된 중심좌표로 설정
  const updateCenterWhenMapMoved = useMemo(
    () =>
      debounce((map) => {
        setCenter({
          lat: map.getCenter().getLat(),
          lng: map.getCenter().getLng(),
        });
      }, 100),
    []
  );

  // 지도가 처음 렌더링되면 중심좌표를 현위치로 설정하고 위치 변화 감지
  const gpsError = (err) => {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  };

  const geolocationOptions = {
    enableHighAccuracy: true,
    maximumAge: 5 * 60 * 1000,
    timeout: 7000,
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (
          pos.coords.latitude !== position.lat ||
          pos.coords.longitude !== position.lng
        ) {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      gpsError,
      geolocationOptions
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
      geolocationOptions
    );
  }, []);

  // 2000m이내 키워드 검색
  const [info, setInfo] = useState();
  const [markers, setMarkers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [preKeyword, setPreKeyword] = useState("");
  const [key, setKey] = useState(0);
  const [curText, setCurText] = useState("");
  const [selectedMarker, setSelectedMarker] = useState();
  const [number, setNumber] = useState(2);

  // input필드 관찰
  const onChange = (e) => {
    setCurText(e.target.value);
    const searchBtn = document.getElementById("search-btn");
    searchBtn.classList.remove("hidden");
  };

  const searchPlaces = () => {
    if (!curText.replace(/^\s+|\s+$/g, "")) {
      alert("검색어를 입력해주세요!");
      return false;
    }

    const searchBtn = document.getElementById("search-btn");
    searchBtn.classList.add("hidden");

    // 기존 keyword와 다른 keyword 검색시 기존 marker와 정보 초기화
    if (curText !== preKeyword && curText !== "") {
      setMarkers([]);
      setPage(1);
      setHasMore(false);
      setInfo(false);
      setKey(key + 1);
    }

    setPreKeyword(curText);

    axios
      .get(`https://dapi.kakao.com/v2/local/search/keyword?`, {
        params: {
          x: position.lng,
          y: position.lat,
          radius: 2000,
          query: curText,
          sort: "distance",
          page: page,
        },
        headers: {
          Authorization: `KakaoAK ${import.meta.env.VITE_APP_RESTAPI_KEY}`,
        },
      })
      .then((res) => {
        let markers = [];
        for (let i = 0; i < res.data.documents.length; i++) {
          markers.push({
            position: {
              lat: res.data.documents[i].y,
              lng: res.data.documents[i].x,
            },
            place_name: res.data.documents[i].place_name,
            category_name: res.data.documents[i].category_name,
            id: res.data.documents[i].id,
            phone: res.data.documents[i].phone,
            place_url: res.data.documents[i].place_url,
            road_address_name: res.data.documents[i].road_address_name,
            distance: res.data.documents[i].distance,
          });
        }

        setMarkers((prevMarkers) => [...prevMarkers, ...markers]);

        if (res.data.meta.is_end === false) {
          setHasMore(true);
          setPage(page + 1);
        } else {
          setHasMore(false);
          setPage(1);
        }
      });
  };

  // 인포윈도우 바깥 클릭시 닫힘
  const [isInfoWindowOpen, setInfoWindowOpen] = useState(false);
  const handleClickOutside = (e) => {
    if (e.target.id.includes("daum-maps")) {
      setInfoWindowOpen(false);
      document.removeEventListener("click", handleClickOutside);
    }
  };
  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
  }, [isInfoWindowOpen]);

  // 현재 위치 변경 감지시 state 초기화
  const isMounted = useRef(false);
  useEffect(() => {
    if (isMounted.current) {
      setPage(1);
      setHasMore(false);
      setMarkers([]);
      setInfo(false);
      setCurText("");
      const searchBtn = document.getElementById("search-btn");
      if (searchBtn !== null) searchBtn.classList.remove("hidden");
    } else {
      isMounted.current = true;
      return;
    }
  }, [position]);

  return (
    <>
      {isMatching === "false" && (
        <>
          <header className="w-full flex justify-between max-w-screen-xl h-[77px] py-[14px]">
            <Link to="/" className="h-full px-4 flex items-center">
              <HeaderLogo />
            </Link>

            <div className="search-bar flex flex-row bg-emerald-600 border border-[#3BB82D] rounded-full relative">
              <input
                className="w-[300px] lg:w-[600px] rounded-full pl-5 focus:outline-none"
                id="keyword"
                type="text"
                onChange={onChange}
                value={curText}
                placeholder="함께 먹고싶은 식당을 검색해요."
              />
              <button
                id="search-btn"
                className="absolute px-5 right-0 top-[10px]"
                onClick={searchPlaces}
              >
                <SearchIcon width="22px" />
              </button>
            </div>

            <Link to="/account" className="h-full px-4 flex items-center">
              로그인
            </Link>
          </header>

          <div className="relative w-full h-full">
            <Map
              className="w-full h-full"
              id="map"
              center={center}
              level={5}
              onCenterChanged={updateCenterWhenMapMoved}
              disableDoubleClick={true}
              disableDoubleClickZoom={true}
            >
              {/* 검색 된 마커 표시 */}
              {markers.map((marker) => (
                <>
                  <MapMarker
                    key={`marker-${marker.content}-${marker.position.lat},${marker.position.lng}`}
                    position={marker.position}
                    onClick={() => {
                      setInfo(marker);
                      setCenter(marker.position);
                      setInfoWindowOpen(true);
                    }}
                    image={{
                      src: "../../../public/assets/map-marker.svg",
                      size: { width: 30, height: 30 },
                    }}
                  />
                  {isInfoWindowOpen &&
                    info &&
                    info.place_name === marker.place_name && (
                      <CustomOverlayMap
                        position={marker.position}
                        yAnchor={1.3}
                        id="infoWindow"
                      >
                        <InfoWindow
                          marker={marker}
                          setIsMatching={setIsMatching}
                          setSelectedMarker={setSelectedMarker}
                          setNumber={setNumber}
                        />
                      </CustomOverlayMap>
                    )}
                </>
              ))}

              {/* 검색 된 리스트 표시 */}
              <div
                key={key}
                className="bg-white text-black absolute z-10 top-[20%] left-10 min-w-[320px] max-w-[320px] rounded-lg max-h-[650px] overflow-y-scroll scrollbar-hide px-5 drop-shadow-2xl"
              >
                {markers.length !== 0 && (
                  <div className="font-bold py-[15px] text-left">검색결과</div>
                )}
                {markers.map((marker) => (
                  <>
                    <div
                      onClick={() => {
                        setInfo(marker);
                        setCenter(marker.position);
                        setInfoWindowOpen(true);
                      }}
                    >
                      <SearchList marker={marker} />
                    </div>
                  </>
                ))}
                {hasMore && (
                  <button
                    className="py-2 font-bold drop-shadow-md"
                    onClick={() => searchPlaces()}
                  >
                    더보기
                  </button>
                )}
              </div>

              {/* 현위치 표시 */}
              <MapMarker
                image={{
                  src: "../../../public/assets/map-pin.svg",
                  size: { width: 20, height: 20 },
                }}
                position={position}
              />

              {/* 가능 반경 표시 */}
              <Circle
                center={position}
                radius={2000}
                strokeColor={"#81be67"}
                strokeWeight={1}
                strokeOpacity={1}
                fillColor={"#b2e39d"}
                fillOpacity={0.23}
              />
            </Map>

            {/* 현위치로 지도도 이동 버튼 */}
            <div className="flex flex-col gap-[10px] absolute z-[1] top-5 right-5 p-[10px]">
              <button
                className="flex justify-center items-center cursor-pointer rounded-full w-[45px] h-[45px] bg-white shadow-[0_0_8px_#00000025]"
                onClick={setCenterToMyPosition}
              >
                <AccIcon width="25px" />
              </button>
            </div>

            {/* 맛집탐방단, 내돈내산맛집 */}
            <div className="flex flex-col gap-[10px] absolute z-[1] bottom-5 right-5 p-[10px]">
              <Link
                to="/openchat"
                className="flex flex-col justify-center items-center rounded-lg w-[80px] h-[80px] bg-[#FF6445] text-white text-sm"
              >
                <ChatIcon width="15px" />
                맛집
                <br />
                탐방단
              </Link>
              <Link
                to="meeteatdb"
                className="flex flex-col justify-center items-center rounded-lg w-[80px] h-[80px] bg-[#FF6445] text-white text-sm"
              >
                <FoodIcon width="15px" />
                내돈내산
                <br />
                맛집
              </Link>
            </div>
          </div>
        </>
      )}
      {isMatching === "true" && (
        <Matching
          setIsMatching={setIsMatching}
          setIsMatched={setIsMatched}
          selectedMarker={selectedMarker}
          position={position}
          number={number}
        />
      )}
    </>
  );
}
