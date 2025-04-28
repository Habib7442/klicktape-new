import { TouchableOpacity, Text } from "react-native";
import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-[rgba(255,215,0,0.2)] border-[rgba(255,215,0,0.4)]";
    case "danger":
      return "bg-[#8B0000] border-[rgba(255,0,0,0.3)]";
    case "success":
      return "bg-[#006400] border-[rgba(0,128,0,0.3)]";
    case "outline":
      return "bg-transparent border-[rgba(255,215,0,0.5)] border-[1px]";
    default:
      return "bg-[rgba(255,215,0,0.1)] border-[rgba(255,215,0,0.3)]";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"]) => {
  switch (variant) {
    case "primary":
      return "text-[#FFD700]";
    case "secondary":
      return "text-[rgba(255,215,0,0.8)]";
    case "danger":
      return "text-[#FF4040]";
    case "success":
      return "text-[#00FF7F]";
    default:
      return "text-[#FFD700]";
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className,
  ...props
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-full rounded-[25px] p-3 flex flex-row justify-center items-center shadow-md shadow-neutral-400/70 border ${getBgVariantStyle(
        bgVariant
      )} ${className}`}
      {...props}
    >
      {IconLeft && <IconLeft />}
      <Text
        className={`text-lg font-rubik-medium ${getTextVariantStyle(textVariant)}`}
      >
        {title}
      </Text>
      {IconRight && <IconRight />}
    </TouchableOpacity>
  );
};

export default CustomButton;