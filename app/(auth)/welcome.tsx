import { router } from "expo-router";
import { useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants";

const Home = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === onboarding.length - 1;

  return (
    <View className="flex-1 bg-black"
    >
      <SafeAreaView className="flex-1 pb-5">
        <TouchableOpacity
          onPress={() => {
            router.replace("/(auth)/sign-in");
          }}
          className="w-[80px] h-[40px] items-center justify-center rounded-[20px] bg-[rgba(128,128,128,0.1)] border border-[rgba(128,128,128,0.3)] ml-auto mr-4 mt-2.5"
        >
          <Text className="text-[#FFD700] text-base font-rubik-medium">
            Skip
          </Text>
        </TouchableOpacity>

        <Swiper
          ref={swiperRef}
          loop={false}
          dot={
            <View className="w-[32px] h-[4px] mx-1 bg-[rgba(255,215,0,0.2)] rounded-full" />
          }
          activeDot={
            <View className="w-[32px] h-[4px] mx-1 bg-[#FFD700] rounded-full" />
          }
          onIndexChanged={(index) => setActiveIndex(index)}
          className="flex-1"
        >
          {onboarding.map((item) => (
            <View
              key={item.id}
              className="flex-1 items-center justify-center px-5"
            >
              <Image
                source={item.image}
                className="w-full h-[300px]"
                resizeMode="contain"
              />
              <View className="flex-row items-center justify-center w-full mt-10">
                <Text className="text-[#FFD700] text-3xl font-rubik-bold text-center mx-10">
                  {item.title}
                </Text>
              </View>
              <Text className="text-white text-base font-rubik-medium text-center mx-10 mt-3">
                {item.description}
              </Text>
            </View>
          ))}
        </Swiper>

        <CustomButton
          title={isLastSlide ? "Get Started" : "Next"}
          onPress={() =>
            isLastSlide
              ? router.replace("/(auth)/sign-in")
              : swiperRef.current?.scrollBy(1)
          }
          className="w-11/12 h-[50px] self-center bg-[rgba(255,215,0,0.1)] rounded-[25px] border border-[rgba(255,215,0,0.3)] justify-center items-center mb-5"
          textVariant="primary"
        />
      </SafeAreaView>
    </View>
  );
};

export default Home;
