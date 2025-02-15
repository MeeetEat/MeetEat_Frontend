import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Arrow from "../../assets/updown-arrow-icon.svg?react";
import FullStar from "../../assets/full-star.svg?react";
import Logo from "../../assets/header-logo.svg?react";
import Review from "../../assets/review.svg?react";
import RestView from "./RestView.jsx";

export default function RestList() {
  // ✅ 확인용 식당 리스트
  const [restaurants, setRestaurants] = useState([]);
  const [maxPage, setMaxPage] = useState(0);
  const [page, setPage] = useState("0");
  const [regionName, setRegionName] = useState("경기");
  const [categoryName, setCategoryName] = useState("전체");
  const [sortedName, setSortedName] = useState("거리순");
  const [placeName, setPlaceName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [position, setPosition] = useState({
    lat: 37.503081,
    lng: 127.04158,
  });

  // 현위치
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
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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

  // 필터 적용시 다시 불러오기
  useEffect(() => {
    setRestaurants([]);
    setPage("0");
    let sort = "DISTANCE";
    if (sortedName === "거리순") sort = "DISTANCE";
    else if (sortedName === "평점순") sort = "RATING";
    apiPOSTRestsLists(regionName, categoryName, placeName, position, sort, "0");
  }, [regionName, categoryName, sortedName]);

  const openSearchFilter = (filter) => {
    setSearchFilter(searchFilter === "" ? filter : "");
  };

  const category = ["전체", "한식", "중식", "일식", "양식"];
  const region = [
    "서울",
    "부산",
    "대구",
    "인천",
    "광주",
    "대전",
    "울산",
    "세종",
    "경기",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
  ];
  const sorted = ["거리순", "평점순"];

  // 입력 값이 변경될 때마다 타이머 설정
  const isMounted = useRef(false);
  useEffect(() => {
    if (isMounted.current) {
      const delayDebounceTimer = setTimeout(() => {
        setRestaurants([]);
        setPage("0");
        let sort = "DISTANCE";
        if (sortedName === "거리순") sort = "DISTANCE";
        else if (sortedName === "평점순") sort = "RATING";
        apiPOSTRestsLists(
          regionName,
          categoryName,
          placeName,
          position,
          sort,
          "0"
        );
      }, 1000); // 디바운스 지연 시간
      return () => clearTimeout(delayDebounceTimer);
    } else {
      isMounted.current = true;
      return;
    }
  }, [placeName]);

  function handleInputChange(event) {
    setPlaceName(event.target.value);
  }

  // 식당 상세조회 모달 변수, 함수
  const [restViewModal, setRestViewModal] = useState(false);
  const [pickedRest, setPickedRest] = useState("");
  const [star, setStar] = useState(new Array(5).fill(false));
  useEffect(() => {
    if (restViewModal) {
      document.body.style.cssText = `
          position: fixed;
          top: -${window.scrollY}px;
          overflow-y: scroll;
          width: 100%;`;
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.cssText = "";
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      };
    }
  }, [restViewModal]);
  const RestViewToggle = (rest) => {
    setStar(new Array(5).fill(false));
    if (!restViewModal) {
      let temp = [...star];
      for (let i = 0; i < 5; i++) {
        if (rest.rating >= i + 1) {
          temp[i] = true;
        }
        setStar(temp);
      }
      apiPOSTRestDetailView(rest.id - 1);
      setCenter({ lat: rest.x, lng: rest.y });
    }
    setRestViewModal(!restViewModal);
  };

  // 무한스크롤
  const observerRef = useRef();
  const boxRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(intersectionObserver); // IntersectionObserver
    if (boxRef.current) {
      observerRef.current.observe(boxRef.current);
      return () => observerRef.current && observerRef.current.disconnect();
    }
  }, [restaurants]);

  const getInfo = async () => {
    if (maxPage < Number(page) + 1) return console.log("마지막페이지입니다.");
    let sort = "DISTANCE";
    if (sortedName === "거리순") sort = "DISTANCE";
    else if (sortedName === "평점순") sort = "RATING";
    apiPOSTRestsLists(
      regionName,
      categoryName,
      placeName,
      position,
      sort,
      String(Number(page) + 1)
    );
    setPage((prev) => prev + 1);
    console.log("info data add...");
  };

  // IntersectionObserver 설정
  const intersectionObserver = (entries, io) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 관찰하고 있는 entry가 화면에 보여지는 경우
        io.unobserve(entry.target); // entry 관찰 해제
        getInfo(); // 데이터 가져오기
      }
    });
  };

  //////////////////////////////////////////////////
  // 임시함수
  //////////////////////////////////////////////////
  async function apiPOSTRestsLists(
    region,
    categoryName,
    placeName,
    position,
    sorted,
    page
  ) {
    await axios
      .post(`${import.meta.env.VITE_BE_API_URL}/restaurants/search`, {
        region: region,
        categoryName: categoryName,
        placeName: placeName,
        userY: position.lat,
        userX: position.lng,
        sorted: sorted,
        page: page,
        size: "20",
      })
      .then((res) => {
        setRestaurants((prev) => [...prev, ...res.data.content]);
        setMaxPage(res.data.totalPages);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async function apiPOSTRestDetailView(restId) {
    await axios
      .get("/restaurants", { params: { restaurantId: restId } })
      .then((res) => {
        setPickedRest(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }
  // async function apiPOSTRestDetailView(restId) {
  //   await axios
  //     .get(`${import.meta.env.VITE_BE_API_URL}/restaurants/${restId}`)
  //     .then((res) => {
  //       setPickedRest(res.data);
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
  // }

  const [center, setCenter] = useState({});

  return (
    <>
      <div className="absolute top-40 min-w-fit flex max-xl:ml-auto flex-col mb-auto items-center">
        <div className="w-72 md:w-96 mb-7 search-bar border border-[#3BB82D] rounded-full relative">
          <input
            className="w-full h-10 rounded-full pl-5 pr-12 focus:outline-none"
            id="keyword"
            onChange={handleInputChange}
            value={placeName}
            type="text"
            placeholder="실제 방문한 식당을 검색해요."
          />
        </div>
        <div className="flex gap-2 mb-3 ml-auto mr-2">
          <ul
            onClick={() => openSearchFilter("category")}
            className={`relative flex flex-col bg-white gap-2 justify-center items-center px-2 py-1 border border-gray-300 rounded-md
                    ${searchFilter === "category" && "border-b-[transparent] rounded-b-none"}`}
          >
            <li className="flex justify-center gap-2 items-center">
              {categoryName}
              <Arrow
                className={`${searchFilter === "category" ? "rotate-180 duration-300 ease-in-out" : "duration-300"} `}
              />
            </li>
            {searchFilter === "category" && (
              <>
                <ul className="absolute flex flex-col w-[67.41px] gap-2 top-[105%] py-1 z-10 bg-[#eeeeee] border border-t-0 rounded-b-md">
                  {category
                    .filter((item) => categoryName !== item)
                    .map((item) => (
                      <li key={item} onClick={() => setCategoryName(item)}>
                        {item}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </ul>
          <ul
            onClick={() => openSearchFilter("region")}
            className={`relative flex flex-col bg-white gap-2 justify-center items-center px-2 py-1 border border-gray-300 rounded-md
                    ${searchFilter === "region" && "border-b-[transparent] rounded-b-none"}`}
          >
            <li className="flex justify-center gap-2 items-center">
              {regionName}
              <Arrow
                className={`${searchFilter === "region" ? "rotate-180 duration-300 ease-in-out" : "duration-300"} `}
              />
            </li>
            {searchFilter === "region" && (
              <>
                <ul className="absolute flex flex-col w-[67.41px] gap-2 top-[105%] py-1 z-10 bg-[#eeeeee] border border-t-0 rounded-b-md">
                  {region
                    .filter((item) => regionName !== item)
                    .sort()
                    .map((item) => (
                      <li key={item} onClick={() => setRegionName(item)}>
                        {item}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </ul>
          <ul
            onClick={() => openSearchFilter("option")}
            className={`relative flex flex-col bg-white gap-2 justify-center items-center px-2 py-1 border border-gray-300 rounded-md 
                    ${searchFilter === "option" && "border-b-[transparent] rounded-b-none"}`}
          >
            <li className="flex justify-center gap-2 items-center">
              {sortedName}
              <Arrow
                className={`${searchFilter === "option" ? "rotate-180 duration-300 ease-in-out" : "duration-300"} `}
              />
            </li>
            {searchFilter === "option" && (
              <>
                <ul className="absolute flex flex-col w-[82.1px] gap-2 top-[105%] py-1 z-10 bg-[#eeeeee] border border-t-0 rounded-b-md">
                  {sorted
                    .filter((item) => sortedName !== item)
                    .sort()
                    .map((item) => (
                      <li key={item} onClick={() => setSortedName(item)}>
                        {item}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </ul>
        </div>
        <div className="grid sm:grid-cols-[350px] min-[750px]:grid-cols-[350px_350px] min-[1150px]:grid-cols-[350px_350px_350px] gap-7 pb-10">
          {restaurants.map((rest, idx) =>
            restaurants.length - 3 === idx ? (
              <>
                <li
                  key={rest.id}
                  className="flex flex-col w-[340px] items-start bg-white rounded-lg drop-shadow-lg p-4 cursor-pointer text-left"
                  onClick={() => RestViewToggle(rest)}
                  ref={boxRef}
                >
                  <div className="bg-gray-300 h-40 w-full rounded-lg mb-3 content-center justify-items-center">
                    {rest.thumbnail ? (
                      <>
                        <img
                          src={rest.thumbnail}
                          className="w-full max-h-40 object-cover rounded-lg"
                        ></img>
                      </>
                    ) : (
                      <Logo className="" />
                    )}
                  </div>
                  <p className="text-lg text-overflow">{rest.place_name}</p>
                  <p className="max-w-[330px] mb-1.5 text-gray-600 text-overflow">
                    {rest.road_address_name}
                  </p>
                  <div className="flex h-6 gap-2 items-start text-base text-gray-500">
                    <div className="flex gap-1 h-6">
                      <span className="flex justify-center items-center ">
                        <FullStar className="w-full h-full text-[#FF6445]" />
                      </span>
                      <span>{rest.rating}</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <span className="flex justify-center items-center ">
                        <Review className="mt-0.5" width="20px" height="20px" />
                      </span>
                      <span>{rest.reviews}</span>
                    </div>
                  </div>
                </li>
              </>
            ) : (
              <>
                <li
                  key={rest.id}
                  className="flex flex-col w-[340px] items-start bg-white rounded-lg drop-shadow-lg p-4 cursor-pointer text-left"
                  onClick={() => RestViewToggle(rest)}
                >
                  <div className="bg-gray-300 h-40 w-full rounded-lg mb-3 content-center justify-items-center">
                    {rest.thumbnail ? (
                      <>
                        <img
                          src={rest.thumbnail}
                          className="w-full max-h-40 object-cover rounded-lg"
                        ></img>
                      </>
                    ) : (
                      <Logo />
                    )}
                  </div>
                  <p className="text-lg text-overflow">{rest.place_name}</p>
                  <p className="max-w-[330px] mb-1.5 text-gray-600 text-overflow">
                    {rest.road_address_name}
                  </p>
                  <div className="flex h-6 gap-2 items-start text-base text-gray-500">
                    <div className="flex gap-1 h-6">
                      <span className="flex justify-center items-center ">
                        <FullStar
                          width="20px"
                          height="20px"
                          className=" text-[#FF6445]"
                        />
                      </span>
                      <span>{rest.rating}</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <span className="flex justify-center items-center ">
                        <Review className="mt-0.5" width="20px" height="20px" />
                      </span>
                      <span>{rest.reviews}</span>
                    </div>
                  </div>
                </li>
              </>
            )
          )}
        </div>
      </div>
      {restViewModal && (
        <RestView
          center={center}
          close={RestViewToggle}
          pickedRest={pickedRest}
          star={star}
        />
      )}
    </>
  );
}
