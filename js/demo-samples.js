// Dữ liệu MẪU cho trang xem demo — khách hàng, dự án, tin nhắn đều là giả, không lấy từ database.
// Người được gắn theo vị trí bàn (desk_slot) để vẫn đúng khi giám đốc đổi tên nhân viên.

export const SAMPLE_PROJECTS = [
  { name: 'Chiến dịch Tết — Cà phê Mộc Sơn', status: 'in_progress', progress: 64, deadline: '20/01', team: ['mkt-1', 'mkt-2', 'design-1'],
    brief: 'Facebook + TikTok Ads mùa Tết, 3 bộ quảng cáo, ngân sách thử nghiệm 30 triệu.' },
  { name: 'Google Ads tìm kiếm — Nha khoa Ánh Dương', status: 'pending_review', progress: 100, deadline: '05/11', team: ['mkt-3'],
    brief: 'Bộ từ khoá niềm răng / implant, 4 nhóm quảng cáo, báo cáo đề xuất giá thầu.' },
  { name: 'Gắn tracking GA4 + Pixel — Shop Lá Xanh', status: 'approved', progress: 100, deadline: '28/10', team: ['tech-1'],
    brief: 'Theo dõi chuyển đổi mua hàng, thêm giỏ hàng; checklist kiểm tra sự kiện.' },
  { name: 'Video TikTok ra mắt — Trà sữa Mây', status: 'changes_requested', progress: 80, deadline: '12/11', team: ['design-2', 'mkt-3'],
    brief: '3 video 15 giây, phụ đề tiếng Việt, logo góc phải. Giám đốc yêu cầu đổi nhạc nền.' },
  { name: 'Tự động hoá báo cáo Ads hằng ngày', status: 'in_progress', progress: 40, deadline: '30/11', team: ['tech-2', 'mkt-1'],
    brief: 'Gom số liệu các tài khoản quảng cáo vào một bảng, gửi tóm tắt mỗi sáng.' },
  { name: 'Bộ banner Black Friday — Thời trang Nâu', status: 'waiting_coordination', progress: 55, deadline: '15/11', team: ['design-1', 'mkt-2'],
    brief: '12 kích thước banner, chờ khách gửi ảnh sản phẩm mới.' },
  { name: 'Đối soát chi phí quảng cáo tháng 10', status: 'pending_review', progress: 100, deadline: '03/11', team: ['acc-1'],
    brief: 'Bảng chi phí theo khách hàng, chênh lệch so với hoá đơn nền tảng 0,4%.' },
  { name: 'Kế hoạch ngân sách quý I', status: 'not_started', progress: 0, deadline: '10/12', team: ['bgd-assistant', 'acc-1'],
    brief: 'Tổng hợp ngân sách dự kiến theo khách hàng và kênh quảng cáo.' },
];

// ago: số phút trước khi mở trang
export const SAMPLE_CHATS = [
  { id: 'all', name: 'Toàn công ty', type: 'group', messages: [
    { from: 'bgd-director', ago: 180, text: 'Chào cả nhà, tuần này ưu tiên các dự án Tết và Black Friday nhé.' },
    { from: 'bgd-assistant', ago: 172, text: 'Em đã đặt lịch họp giao ban sáng thứ Hai lúc 9h.' },
    { from: 'mkt-1', ago: 165, text: 'Nhóm Ads nhận ạ 👍' },
  ] },
  { id: 'mkt', name: 'Nhóm Marketing Ads', type: 'group', messages: [
    { from: 'mkt-1', ago: 95, text: 'Bộ quảng cáo Tết của Mộc Sơn, em lên giúp anh 3 mẫu nội dung nhé.' },
    { from: 'mkt-2', ago: 90, text: 'Dạ em gửi bản nháp trước 3h chiều ạ.' },
    { from: 'mkt-3', ago: 62, text: 'Google Ads Nha khoa Ánh Dương em đã gửi giám đốc duyệt.', project: 'Google Ads tìm kiếm — Nha khoa Ánh Dương' },
    { from: 'bgd-director', ago: 41, text: 'Anh xem trong chiều nay.' },
  ] },
  { id: 'design', name: 'Nhóm Design & Edit', type: 'group', messages: [
    { from: 'design-2', ago: 75, text: 'Video Trà sữa Mây em đổi nhạc nền theo góp ý rồi, đang xuất lại.' },
    { from: 'design-1', ago: 70, text: 'Banner Black Friday đang chờ khách gửi ảnh sản phẩm, em dựng trước bố cục.' },
  ] },
  { id: 'tech', name: 'Nhóm Kỹ thuật', type: 'group', messages: [
    { from: 'tech-2', ago: 120, text: 'Script gom số liệu Ads chạy thử ổn, còn phần gửi tóm tắt buổi sáng.' },
    { from: 'tech-1', ago: 110, text: 'Tracking Shop Lá Xanh đã được duyệt, em đóng checklist.', file: 'checklist-tracking.csv' },
  ] },
  { id: 'acc', name: 'Nhóm Kế toán', type: 'group', messages: [
    { from: 'acc-1', ago: 50, text: 'Bảng đối soát chi phí tháng 10 em gửi duyệt rồi ạ, chênh lệch 0,4%.', file: 'doi-soat-thang-10.csv' },
    { from: 'bgd-director', ago: 45, text: 'Ok em, anh duyệt trong hôm nay.' },
  ] },
];

// Việc mới giao trong lúc xem demo: team[0] là người phụ trách chính, team[1] là người phối hợp.
export const NEW_JOBS = [
  { name: 'Landing page khuyến mãi — Spa Hoa Sen', team: ['tech-1', 'design-1'], group: 'tech', days: 5,
    brief: 'Trang đăng ký ưu đãi 20%, form gọi lại, gắn tracking chuyển đổi.',
    ack: 'Em nhận việc. Em dựng khung trang trước, phần hình ảnh nhờ bên Design.',
    ask: 'Bạn làm giúp mình ảnh banner đầu trang 1920×800 cho Spa Hoa Sen nhé?',
    reply: 'Ok, 20 phút nữa mình gửi bản đầu tiên.',
    deliver: 'Trang đã xong, form gửi về email và đã bắn sự kiện chuyển đổi.', file: 'spa-hoa-sen-landing.html',
    approve: 'Trang gọn, đẹp. Duyệt!' },
  { name: 'Quảng cáo Facebook khai trương — Bánh mì Phố Cổ', team: ['mkt-2', 'design-2'], group: 'mkt', days: 3,
    brief: '5 mẫu nội dung và 1 video 10 giây cho chi nhánh mới.',
    ack: 'Em nhận ạ. Em viết 5 mẫu nội dung trước.',
    ask: 'Bạn dựng giúp mình video 10 giây khai trương, có logo và phụ đề nhé.',
    reply: 'Mình nhận, dùng nhạc vui tươi nhé.',
    deliver: 'Em gửi 5 mẫu nội dung và video 10 giây.', file: 'banh-mi-pho-co-ads.csv',
    approve: 'Nội dung ổn, cho chạy được. Duyệt nhé!' },
  { name: 'Báo cáo Google Ads tháng 10 — Nha khoa Ánh Dương', team: ['mkt-3', 'acc-1'], group: 'mkt', days: 2,
    brief: 'Tổng hợp chi phí, lượt gọi, chi phí mỗi khách và đề xuất cho tháng sau.',
    ack: 'Em nhận. Em tổng hợp số liệu chiến dịch trước.',
    ask: 'Chị gửi giúp em chi phí đã xuất hoá đơn tháng 10 của khách này nhé.',
    reply: 'Chị gửi rồi nhé, khớp với tài khoản quảng cáo.',
    deliver: 'Báo cáo xong: chi phí mỗi cuộc gọi giảm 12% so với tháng 9.', file: 'bao-cao-thang-10.csv',
    approve: 'Báo cáo rõ ràng. Duyệt, gửi khách luôn nhé.' },
  { name: 'Bộ ảnh sản phẩm Tết — Cà phê Mộc Sơn', team: ['design-1', 'mkt-1'], group: 'design', days: 4,
    brief: 'Chỉnh màu, ghép logo cho 12 ảnh sản phẩm, đủ kích thước Facebook và TikTok.',
    ack: 'Em nhận, em chỉnh màu và ghép logo cho 12 ảnh.',
    ask: 'Anh xem giúp em tông đỏ - vàng này cho bộ Tết được chưa ạ?',
    reply: 'Tông này ổn, làm tiếp đi em.',
    deliver: '12 ảnh đã xong, đủ kích thước Facebook và TikTok.', file: 'moc-son-tet.zip',
    approve: 'Ảnh đẹp. Duyệt!' },
];
