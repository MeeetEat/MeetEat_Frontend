import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import EmptyStar from "../../assets/empty-star.svg?react";
import FullStar from "../../assets/full-star.svg?react";
import { Map } from "react-kakao-maps-sdk";
import authStore from "../../store/authStore";

export default function WriteReview() {
  // 로그인 확인
  useEffect(() => {
    !authStore.loggedIn && alert("로그인 후 이용해주세요!");
    !authStore.loggedIn && window.location.replace("/");
  }, []);

  const location = useLocation();
  const info = { ...location.state };

  // 이미지 핸들러
  const [imageList, setImageList] = useState([]);
  const handleAddImages = (e) => {
    setImageList([]);
    const files = e.target.files;
    let imageUrlLists = [];

    for (let i = 0; i < files.length; i++) {
      const currentImageUrl = URL.createObjectURL(files[i]);
      imageUrlLists.push(currentImageUrl);
    }

    if (imageUrlLists.length > 7) {
      imageUrlLists = imageUrlLists.slice(0, 7);
      alert("사진은 최대 7장까지 첨부 가능합니다.");
    }
    setImageList(imageUrlLists);
  };

  // 초기 빈 별 그리기
  const [starScore, setStarScore] = useState(1);
  const handleRatingStar = () => {
    let result = [];
    for (let i = 0; i < 5; i++) {
      result.push(
        <span
          className="w-[50px] text-[#FF6445]"
          key={i + 1}
          onClick={() => setStarScore(i + 1)}
        >
          {i + 1 <= starScore ? (
            <FullStar className="star" />
          ) : (
            <EmptyStar className="star" />
          )}
        </span>
      );
    }
    console.log(result);
    return result;
  };

  const navigate = useNavigate();
  const handleWriteNext = () => {
    alert("해당 리뷰는 마이페이지에서 다시 작성하실 수 있습니다.");
    window.sessionStorage.removeItem("isCompleted");
    window.sessionStorage.removeItem("isMatched");
    window.sessionStorage.removeItem("matchedData");
    navigate("/");
  };

  const handleWriteComplete = () => {
    const textareaValue = document.getElementById("textarea").value;
    apiRestReviewWrite(info.matchedId, info.restId, textareaValue);
    alert("작성이 완료되었습니다.");
    navigate("/");
  };

  async function apiRestReviewWrite(matchedId, restId, textareaValue) {
    await axios
      .post(
        `${import.meta.env.VITE_BE_API_URL}/restaurants/review`,
        {
          matchingHistoryId: matchedId,
          restaurantId: restId,
          starRate: starScore,
          description: textareaValue,
          imgs: imageList,
        },
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then(() => {
        alert("작성 완료되었습니다.");
      })
      .catch((err) => {
        console.log(err);
      });
  }

  // 지도가 처음 렌더링되면 중심좌표를 현위치로 설정하고 위치 변화 감지\
  const [position, setPosition] = useState({
    lat: 37.503081,
    lng: 127.05,
  });
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
      geolocationOptions
    );
  }, []);

  return (
    <>
      <div className="bg-map relative w-full h-full">
        <div className="bg-black/40 absolute w-full h-full z-10"></div>
        <Map id="map" className="w-full h-full" center={position} level={5} />
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[790px] h-[550px] bg-white rounded-lg drop-shadow-2xl z-20 place-items-center flex flex-col gap-3 pt-14">
        <h1 className="text-2xl font-bold">{info.restName}</h1>
        <div>
          <div className="stars flex flex-row justify-center pb-2">
            {handleRatingStar()}
          </div>
        </div>
        <textarea
          id="textarea"
          className="w-[300px] md:w-[400px] h-[100px] resize-none border p-2"
          placeholder="방문후기를 작성해주세요
다른 사용자들의 식당 선정시 도움이 됩니다"
        ></textarea>

        <label htmlFor="inputFile">
          <div className="w-[300px] md:w-[400px] h-[35px] content-center border p-1 px-4 rounded-lg">
            사진 첨부
          </div>
          <input
            id="inputFile"
            type="file"
            multiple
            accept="image/jpg,image/jpeg,image/png,image/raw,image/heic,image/heif"
            className="hidden"
            onChange={handleAddImages}
          />
        </label>
        <div className="img-container flex flex-row gap-3 w-[300px] md:w-[400px] relative">
          <div className="flex flex-row max-w-[300px] md:max-w-[400px] gap-3 overflow-x-scroll scrollbar-hide">
            {imageList.length === 0 && (
              <>
                <label htmlFor="inputFile">
                  <div className="w-[100px] h-[100px] content-center rounded-lg border border-slate-200 text-slate-200 text-3xl ">
                    +
                  </div>
                  <input
                    id="inputFile"
                    type="file"
                    multiple
                    accept="image/jpg,image/jpeg,image/png,image/raw,image/heic,image/heif"
                    className="hidden"
                    onChange={handleAddImages}
                  />
                </label>
              </>
            )}
            {imageList.map((image, idx) => (
              <>
                <img
                  src={image}
                  alt={`미리보기${idx}`}
                  className="w-[100px] h-[100px] object-cover rounded-lg border border-slate-200"
                />
              </>
            ))}
          </div>
        </div>
        <button
          onClick={handleWriteComplete}
          className="w-[300px] md:w-[400px] p-2 bg-[#FF6445] text-white rounded-lg"
        >
          작성완료
        </button>
        <button
          onClick={handleWriteNext}
          className="absolute bottom-2 w-[300px] md:w-[400px] p-2  text-[#555555] text-sm"
        >
          다음에 작성할게요.
        </button>
      </div>
    </>
  );
}
