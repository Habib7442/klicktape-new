import onboarding1 from "@/assets/images/onboarding1.png";
import onboarding2 from "@/assets/images/onboarding2.png";
import onboarding3 from "@/assets/images/onboarding3.png";
import avatar1 from "@/assets/images/avatar1.jpg";
import avatar2 from "@/assets/images/avatar2.jpg";
import avatar3 from "@/assets/images/avatar3.jpg";
import homeIcon from "@/assets/icons/home.png";
import createIcon from "@/assets/icons/create.png";
import profileIcon from "@/assets/icons/profile.png";
import reelsIcon from "@/assets/icons/reels.png";
import roomsIcon from "@/assets/icons/rooms.png";
import searchIcon from "@/assets/icons/search.png";

export const images = {
  onboarding1,
  onboarding2,
  onboarding3,
};

export const icons = {
  homeIcon,
  createIcon,
  profileIcon,
  reelsIcon,
  roomsIcon,
  searchIcon
};

export const avatars = [avatar1, avatar2, avatar3];

export const onboarding = [
  {
    id: 1,
    title: "Express Yourself Freely",
    description:
      "Share your thoughts and connect with others while staying completely anonymous on Klicktape.",
    image: images.onboarding1,
  },
  {
    id: 2,
    title: "Join Anonymous Rooms",
    description:
      "Participate in group discussions and conversations without revealing your identity.",
    image: images.onboarding2,
  },
  {
    id: 3,
    title: "Create & Share Content",
    description:
      "Share posts, stories, and short videos while maintaining your privacy in a safe environment.",
    image: images.onboarding3,
  },
];
