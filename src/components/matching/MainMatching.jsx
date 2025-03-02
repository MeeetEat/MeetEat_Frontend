import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { Map, MapMarker, Circle, CustomOverlayMap } from "react-kakao-maps-sdk";
import { debounce } from "lodash";
import axios from "axios";
import { callApi } from "../hooks/useAxios";
import AccIcon from "../../assets/acc-icon.svg?react";
import HeaderLogo from "../../assets/header-logo.svg?react";
import FoodIcon from "../../assets/food-line.svg?react";
import MypageIcon from "../../assets/ham-bar.svg?react";
import SearchList from "./SearchList";
import InfoWindow from "./InfoWindow";
import Matching from "./Matching";
import { useNavigate } from "react-router-dom";
import authStore from "../../store/authStore";
import matchingStore from "../../store/matchingStore";
import { BottomSheet } from "react-spring-bottom-sheet";
import "../../customBottomSheet.css";

export default function MainMatching() {
  const navigate = useNavigate();
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [isLoggedIn, setLoggedIn] = useState();
  const [isMatching, setIsMatching] = useState(false);

  // 로그인, 매칭 확인
  useLayoutEffect(() => {
    const getProfile = async () => {
      const resProfile = await callApi("/users/profile", "GET");
      console.log(resProfile.data);
      if (resProfile.data !== undefined) {
        if (resProfile.data.isPenalty)
          window.sessionStorage.setItem("isPenalty", true);
        else {
          window.sessionStorage.setItem("isPenalty", false);
          getMatching();
        }
      }
    };

    const getMatching = async () => {
      const resMatching = await callApi("/matching", "GET");
      console.log()
      console.log("/matching");
      console.log(resMatching.data);
      if (
        resMatching.data !== null &&
        resMatching.data.matching.status !== "CANCELLED"
      ) {
        matchingStore.setIsCompleted(true);
        window.sessionStorage.setItem("isCompleted", "true");
        window.sessionStorage.setItem(
          "matchedData",
          JSON.stringify(resMatching.data),
        );
        completed();
      } else matchingStore.setIsCompleted(false);
    };

    authStore.checkLoggedIn();
    authStore.loggedIn && getProfile();

    setLoggedIn(authStore.loggedIn);
    matchingStore.checkMatching();
    matchingStore.checkMatched();
    matchingStore.checkCompleted();
    setIsMatching(matchingStore.isMatching);
  }, []);

  const completed = () => {
    const now = new Date(); // 오늘 날짜
    const firstDay = new Date(
      JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).matching.createdAt,
    ); // 시작 날짜
    console.log(now);
    console.log(firstDay);
    const toNow = now.getTime(); // 오늘까지 지난 시간(밀리 초)
    const toFirst = firstDay.getTime(); // 첫날까지 지난 시간(밀리 초)
    const passedTimeMin = (Number(toNow) - Number(toFirst)) / 60000; // 첫날부터 오늘까지 지난 시간(밀리 초)
    console.log(passedTimeMin);
    // 매칭 완료된 이후 60분 경과 후에는 리뷰페이지로 이동
    if (passedTimeMin >= 5) {
      const restsId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.id;
      const restsName = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.restaurant.name;
      const matchedId = JSON.parse(window.sessionStorage.getItem("matchedData"))
        .matching.id;
      const matchingHistoryId = JSON.parse(
        window.sessionStorage.getItem("matchedData"),
      ).id;
      return navigate(`/rests/write/${matchingHistoryId}`, {
        state: {
          restId: `${restsId}`,
          restName: `${restsName}`,
          matchedId: `${matchedId}`,
          matchingHistoryId: `${matchingHistoryId}`,
        },
      });
    }
    const id = JSON.parse(window.sessionStorage.getItem("matchedData")).matchingHistoryId
    return navigate(`/matching/complete/${id}`);
  };

  // 브라우저 종료, 새로고침, 뒤로가기의 경우 매칭 취소 api 전송
  // sse의 경우 새로고침시 이전 메세지를 다시 받을 수 없음
  // 새로고침, 창닫기 방지
  const beforeunloadFunc = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };

  useEffect(() => {
    window.addEventListener("beforeunload", beforeunloadFunc);
    return () => {
      window.removeEventListener("beforeunload", beforeunloadFunc);
    };
  }, [isMatching]);

  //새로고침 확인을 눌렀을 경우 unload 이벤트 실행
  const unloadFunc = () => {
    console.log("실행");
    window.sessionStorage.removeItem("isMatching");
    setIsMatching(false);
    setPage(1);
    setHasMore(false);
    setMarkers([]);
    setInfo(false);
    setCurText("");
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
    [],
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

  // 2000m이내 키워드 검색
  const [info, setInfo] = useState();
  const [markers, setMarkers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [key, setKey] = useState(0);
  const [curText, setCurText] = useState("");
  const [selectedMarker, setSelectedMarker] = useState();
  const [number, setNumber] = useState(2);

  // 입력 값이 변경될 때마다 타이머 설정
  useEffect(() => {
    if (isMounted.current) {
      const delayDebounceTimer = setTimeout(() => {
        setMarkers([]);
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
              Authorization: `KakaoAK ${import.meta.env.VITE_APP_KAKAO_REST_KEY}`,
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
            setBottomSheetOpen(true);

            if (res.data.meta.is_end === false) {
              setHasMore(true);
              setPage(page + 1);
            } else {
              setHasMore(false);
              setPage(1);
            }
          });
      }, 500); // 디바운스 지연 시간
      return () => clearTimeout(delayDebounceTimer);
    } else {
      isMounted.current = true;
      return;
    }
  }, [curText]);

  function handleInputChange(event) {
    setCurText(event.target.value);
  }

  const searchPlaces = () => {
    setInfoWindowOpen(false);
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
          Authorization: `KakaoAK ${import.meta.env.VITE_APP_KAKAO_REST_KEY}`,
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
        if (res.data.documents.length !== 0) setBottomSheetOpen(true);
        if (res.data.documents.length === 0) setBottomSheetOpen(false);

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
      {!isMatching && (
        <>
          <header className="fixed left-0 right-0 top-0 z-10 flex h-[77px] justify-center bg-white py-3 shadow-lg">
            <div className="flex w-full max-w-screen-xl justify-between">
              <Link
                to="/"
                className="hidden h-full sm:flex sm:items-center sm:px-4"
              >
                <HeaderLogo />
              </Link>

              <div className="search-bar relative mx-4 flex w-[70%] flex-row rounded-full border border-[#3BB82D] bg-emerald-600 lg:max-w-[600px]">
                <input
                  className="w-full rounded-full px-5 focus:outline-none lg:max-w-[600px]"
                  id="keyword"
                  type="text"
                  onChange={handleInputChange}
                  value={curText}
                  placeholder="함께 먹고싶은 식당을 검색해요."
                />
              </div>
              {isLoggedIn ? (
                <>
                  <Link
                    to={`/mypage`}
                    className="flex h-full min-w-[60px] items-center pl-4 text-xs sm:text-base"
                  >
                    <MypageIcon width="25px" className="sm:hidden" />
                    <div className="hidden pr-5 sm:block sm:min-w-[75px]">
                      프로필
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/account" className="flex h-full items-center px-4">
                    로그인
                  </Link>
                </>
              )}
            </div>
          </header>
          <div className="relative h-full w-full">
            <Map
              className="h-full w-full"
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
                      setCenter({
                        lat: `${Number(marker.position.lat) - 0.007}`,
                        lng: `${Number(marker.position.lng) + 0.005}`,
                      });
                      setInfoWindowOpen(true);
                    }}
                    image={{
                      src: "/assets/map-marker.svg",
                      size: { width: 25, height: 25 },
                    }}
                  />
                  {window.innerWidth > 950 &&
                    isInfoWindowOpen &&
                    info &&
                    info.place_name === marker.place_name &&
                    info.phone === marker.phone && (
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
                          isLoggedIn={isLoggedIn}
                        />
                      </CustomOverlayMap>
                    )}
                  {window.innerWidth <= 950 &&
                    isInfoWindowOpen &&
                    info &&
                    info.place_name === marker.place_name &&
                    info.phone === marker.phone && (
                      <CustomOverlayMap
                        position={marker.position}
                        id="infoWindow"
                      >
                        <InfoWindow
                          marker={marker}
                          setIsMatching={setIsMatching}
                          setSelectedMarker={setSelectedMarker}
                          setNumber={setNumber}
                          isLoggedIn={isLoggedIn}
                        />
                      </CustomOverlayMap>
                    )}
                </>
              ))}

              {/* 검색 된 리스트 표시 */}
              <div
                key={key}
                className="absolute left-10 top-[20%] z-10 hidden max-h-[650px] min-w-[320px] max-w-[320px] overflow-y-scroll rounded-lg bg-white px-5 text-black drop-shadow-2xl scrollbar-hide min-[950px]:block"
              >
                {markers.length !== 0 && (
                  <div className="py-[15px] text-left font-bold">검색결과</div>
                )}
                {markers.map((marker) => (
                  <>
                    <div
                      onClick={() => {
                        setInfo(marker);
                        setCenter({
                          lat: `${Number(marker.position.lat) - 0.007}`,
                          lng: `${Number(marker.position.lng) + 0.005}`,
                        });
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
              {/*검색된 리스트 표시 : 모바일 */}
              {window.innerWidth <= 950 && (
                <>
                  <BottomSheet
                    open={bottomSheetOpen}
                    blocking={false}
                    // the first snap points height depends on the content, while the second one is equivalent to 60vh
                    snapPoints={({ minHeight, maxHeight }) => [
                      minHeight * 0 + 120,
                      maxHeight / 2.5,
                    ]}
                    // Opens the largest snap point by default, unless the user selected one previously
                    defaultSnap={({ lastSnap, snapPoints }) =>
                      lastSnap ?? Math.max(...snapPoints)
                    }
                  >
                    {markers.length === 0 && (
                      <>
                        <div className="py-[15px] text-left font-bold">
                          검색결과
                        </div>
                        <div>검색 결과가 없습니다.</div>
                      </>
                    )}
                    {markers.length !== 0 && (
                      <div className="py-[15px] text-left font-bold">
                        검색결과
                      </div>
                    )}
                    {markers.map((marker) => (
                      <>
                        <div
                          onClick={() => {
                            setInfo(marker);
                            setCenter({
                              lat: `${Number(marker.position.lat) - 0.007}`,
                              lng: `${Number(marker.position.lng) + 0.005}`,
                            });
                            setInfoWindowOpen(true);
                          }}
                        >
                          <SearchList marker={marker} />
                        </div>
                      </>
                    ))}
                    {hasMore && (
                      <button
                        className="w-full py-3 font-bold drop-shadow-md"
                        onClick={() => searchPlaces()}
                      >
                        더보기
                      </button>
                    )}
                  </BottomSheet>
                </>
              )}

              {/* 현위치 표시 */}
              <MapMarker
                image={{
                  src: "/assets/map-pin.svg",
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
            <div className="absolute right-2 top-[5.5rem] z-[10] flex flex-col gap-[10px] p-[10px]">
              <button
                className="flex h-[45px] w-[45px] cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_0_8px_#00000025]"
                onClick={setCenterToMyPosition}
              >
                <AccIcon className="w-[20px] sm:w-[25px]" />
              </button>
            </div>

            {/* 내돈내산맛집 */}
            <div className="absolute right-2 top-[9rem] z-[1] flex flex-col gap-[10px] p-[10px] sm:bottom-2 sm:top-[10rem]">
              <Link
                to="meeteatdb"
                className="flex h-[45px] w-[45px] flex-col items-center justify-center rounded-full bg-[#FF6445] text-sm text-white shadow-[0_0_8px_#00000025] sm:h-[80px] sm:w-[80px] sm:rounded-lg"
              >
                <FoodIcon width="15px" />
                <div className="hidden sm:block">
                  내돈내산
                  <br />
                  맛집
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
      {isMatching && (
        <Matching
          setIsMatching={setIsMatching}
          selectedMarker={selectedMarker}
          setInfo={setInfo}
          position={position}
          number={number}
        />
      )}
    </>
  );
}
