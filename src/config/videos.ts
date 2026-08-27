export interface VideoEntry {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
}

export const VIDEO_LIBRARY: VideoEntry[] = [
  {
    id: "demo-1",
    title: "Thingsx Retail Video -1",
    url: "http://thingsx.home:8080/Demo_videos/THINGSX%20retail%20VIDEO%202209%201.1.mp4",
  },
  {
    id: "demo-2",
    title: "Thingsx GCC version Video",
    url: "http://thingsx.home:8080/Demo_videos/ThingX GCC version Video.mp4",
  },
  {
    id: "demo-3",
    title: "Thingsx Warehouse Video",
    url: "http://thingsx.home:8080/Demo_videos/Warehouse GCC version Video FINAL.mp4",
  },
  {
    id: "demo-4",
    title: "Thingsx Computer Vision Video -2",
    url: "http://thingsx.home:8080/Demo_videos/ThingsX comp vision video.mp4",
  },
  {
    id: "demo-5",
    title: "People Tracking",
    url: "http://thingsx.home:8080/Demo_videos/cam_entry.mp4",
  },
  {
    id: "demo-6",
    title: "People Tracking packaged food zone",
    url: "http://thingsx.home:8080/Demo_videos/retail_2.mp4",
  },
  {
    id: "demo-7",
    title: "Product Interaction packaged food zone",
    url: "http://thingsx.home:8080/Demo_videos/retail_3.mp4",
  },
  {
    id: "demo-8",
    title: "Product Interaction Daily Essentials zone",
    url: "http://thingsx.home:8080/Demo_videos/retail_4.mp4",
  },
  {
    id: "demo-9",
    title: "People Tracking Daily Essentials zone and household zone",
    url: "http://thingsx.home:8080/Demo_videos/retail_5.mp4",
  },
  {
    id: "demo-10",
    title: "ThingsX Retail ComputerVision Demo-1",
    url: "http://thingsx.home:8080/Demo_videos/ThingsX_Retail_V1.mp4",
  },
  {
    id: "demo-11",
    title: "Food Grader Video",
    url: "http://thingsx.home:8080/Demo_videos/produce_inspection_07_26.mp4",
  },
]; 
