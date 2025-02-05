import {useState} from "react";
import {Link} from "react-router-dom";
import HeaderLogo from "../../assets/header-logo.svg?react";
import ShowPWIcon from "../../assets/showPW-icon.svg?react";
import HidePWIcon from "../../assets/hidePW-icon.svg?react";
import KakaoIcon from "../../assets/Login-icon-kakao.svg?react";
import NaverIcon from "../../assets/Login-icon-naver.svg?react";

export default function Login() {

    // 비밀번호 보이기/숨기기
    const [showPW, setShowPW] = useState(false);
    const togglePW = () => {
        setShowPW(!showPW);
    }

    return (
        <form className="flex w-96 justify-center items-center">
            <div className="flex flex-1 flex-col gap-3 justify-center">
                <h1 className="flex justify-center h-8 mb-8">
                    <Link to={"/"}><HeaderLogo className="h-full w-full"/></Link>
                </h1>
                {/* 이메일 형식일 때 통과 하도록 적기 */}
                <div className="flex flex-col items-start">
                    <span className="text-gray-700 after:ml-0.5 after:text-red-500 after:content-['*']">이메일</span>
                    <input type="email" name="email" className="w-full h-11 outline-0 px-2 border-b border-gray-300"
                           placeholder="email@example.com" required/>
                    <span className="text-sm text-[#FF0000] mt-2 h-5">아이디가 일치하지 않습니다.</span>
                </div>
                <div className="relative flex flex-col items-start">
                    <span className="text-gray-700 after:ml-0.5 after:text-red-500 after:content-['*']">비밀번호</span>
                    <label className="relative w-full">
                        <input type={showPW ? "text" : "password"} name="email"
                               className="w-full h-11 outline-0 border-b px-2 border-gray-300"
                               placeholder="비밀번호를 입력해주세요" required/>
                        <div className="flex w-5 absolute top-1/2 -translate-y-1/2 right-2 text-gray-500" onClick={togglePW}>
                            {showPW ? (
                                <ShowPWIcon className="w-full h-full"/>
                            ) : (
                                <HidePWIcon className="w-full h-full"/>
                            )}
                        </div>
                    </label>
                    <span className="text-sm text-[#FF0000] mt-2 h-5">비밀번호가 일치하지 않습니다.</span>
                </div>
                <button type="submit" className="w-full h-11 bg-gray-200 rounded-md hover:bg-[#FF6445] hover:text-white">로그인</button>
                <div className="flex gap-3 justify-center text-xs">
                    <Link to="/account/signup"
                          className="relative border-b-2 text-base text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-400">회원이
                        아니신가요?</Link>
                </div>
                <p className="text-sm mt-5">SNS 간편 로그인</p>
                <div className="flex h-14 justify-center gap-4">
                    <button><NaverIcon className="w-full h-full"/></button>
                    <button><KakaoIcon className="w-full h-full"/></button>
                </div>
            </div>
        </form>
    )
}
