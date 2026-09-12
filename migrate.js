const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'admin/data/submissions.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.teams = [
  { id: 't1', name: 'CHERNET TESEMA', role: 'Managing Director', image: 'assets/img_2.jpeg' },
  { id: 't2', name: 'MIKIYAS TESFAYE', role: 'Frontend Developer', image: 'assets/img_0.jpeg' },
  { id: 't3', name: 'YESUNEH GIZAW', role: 'Backend Developer', image: 'assets/img_5.jpeg' }
];

data.services = [
  { id: 's1', name: 'Air Freight', title: 'Fast And Reliable Air Cargo Solutions', description: 'YM Logistics provides reliable air freight forwarding solutions through strong partnerships with leading airlines including Ethiopian Airlines Cargo, Emirates SkyCargo, Qatar Airways Cargo, Kenya Airways Cargo, and other global carriers. We support businesses with fast, secure, and efficient transportation solutions for time-sensitive shipments, connecting Ethiopia with major global markets.', image: 'assets/air.jpg' },
  { id: 's2', name: 'Sea Freight', title: 'Efficient Ocean Freight Solutions', description: 'Our sea freight forwarding services provide flexible and cost-effective cargo solutions through partnerships with major shipping lines including Maersk, CMA CGM, PIL, COSCO, MSC, and other international carriers. Through strategic gateway options including Djibouti Port, Mombasa Port, and Berbera Port, we help businesses move cargo efficiently across regional and global markets.', image: 'assets/ship.jpg' },
  { id: 's3', name: 'Special Cargo', title: 'Expert Handling For Sensitive And Specialized Cargo', description: 'We provide professional handling solutions for specialized shipments including Dangerous Goods (DG), IMDG cargo, Live Animals, Human Remains (HUM), and Diplomatic Cargo. Our experienced team ensures every shipment follows strict safety procedures, regulatory requirements, and international handling standards.', image: 'assets/sea-container.jpg' },
  { id: 's4', name: 'Transportation', title: 'Reliable Inland And Cross Border Transportation', description: 'Our transportation network provides efficient cargo movement across Ethiopia and extends throughout East Africa. We coordinate reliable inland transportation solutions to ensure smooth connections between ports, warehouses, and final destinations.', image: 'assets/cross.jpg' },
  { id: 's5', name: 'Customs Clearance', title: 'Smooth And Reliable Customs Clearance Solutions', description: 'YM Logistics provides professional customs clearance services to help businesses navigate import and export procedures efficiently. Our experienced team manages documentation, regulatory requirements, and coordination with relevant authorities to minimize delays and ensure smooth cargo release.', image: 'assets/inland.jpg' },
  { id: 's6', name: 'Packaging', title: 'Secure Packaging Solutions For Every Shipment', description: 'YM Logistics provides professional packaging and packing solutions designed to protect cargo throughout the transportation process. From standard commercial shipments to sensitive and specialized cargo, our team ensures goods are properly prepared, secured, and handled according to transportation requirements and international standards.', image: 'assets/packaging.jpg' },
  { id: 's7', name: 'Project Cargo', title: 'Specialized Solutions For Complex Cargo Projects', description: 'YM Logistics provides project cargo and oversized cargo handling solutions for large, heavy, and complex shipments that require careful planning and professional coordination. From industrial equipment and heavy machinery to specialized project materials, we manage every stage of the transportation process to ensure safe, efficient, and reliable cargo movement.', image: 'assets/project-cargo.jpg' }
];

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Migrated submissions.json');
