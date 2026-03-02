# API Audit Data Extraction

## File: app.astroline-today-1-clean.har

### POST /collector/user-property
- **Full URL**: https://evtruck.magnus.ms/collector/user-property
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### POST /collector/event
- **Full URL**: https://evtruck.magnus.ms/collector/event
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### POST /api/v1/auth/firebase/create
- **Full URL**: https://astrology.astroline.app/api/v1/auth/firebase/create
- **Request Payload Preview**: {"uid":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1"}...
- **Response Preview**: 
```json
{"custom_token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJmaXJlYmFzZS1hZG1pbnNkay1iMzl1ZkBhc3Ryb2xpbmUtd2ViLTItMC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInN1YiI6ImZpcmViYXNlLWFkbWluc2RrLWIzOXVmQGFzdHJvbGluZS13ZWItMi0wLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiYXVkIjoiaHR0cHM6Ly9pZGVudGl0eXRvb2xraXQuZ29vZ2xlYXBpcy5jb20vZ29vZ2xlLmlkZW50aXR5LmlkZW50aXR5dG9vbGtpdC52MS5JZGVudGl0eVRvb2xraXQiLCJpYXQiOjE3NzIyNTQxMTMsImV4cCI6MTc3MjI1NzcxMywidWlkIjoiODBjYjZlYzAtZjg4NS0xMWYwLTg1MzAtYmRjNGNiMjJhM2UxIn0.JyJ4HbZFEn...
```

### POST /api/v1/auth/firebase/auth
- **Full URL**: https://astrology.astroline.app/api/v1/auth/firebase/auth
- **Request Payload Preview**: {"token":"eyJhbGciOiJSUzI1NiIsImtpZCI6IjJjMjdhZmY1YzlkNGU1MzVkNWRjMmMwNWM1YTE2N2FlMmY1NjgxYzIiLCJ0eX...
- **Response Preview**: 
```json
{"profile":{"id":371495410,"name":"You","access_token":"VrXMRjpaVJaeILN1Cr_l7_zrjIo5HlQW","device_id":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","device_id_new":null,"gender":0,"birthdate":"2000-01-01","marital_status":0,"birthtime":1165,"utc_offset":5,"birth_place":"Bharuch, Gujarat, India","lat":21.7080427,"lon":72.9956936,"is_migrated":0,"is_unsubscriber":1,"full_language_code":"en","lang":"en","email":"darshanrana036@gmail.com","data":{"time_format":"12","withAccountManage":true,"show_subscripti...
```

### GET /api/v1/payments/subscriptions
- **Full URL**: https://astrology.astroline.app/api/v1/payments/subscriptions?search=active:1
- **Response Preview**: 
```json
{"data":[{"resource_type":"Subscription","id":8281895,"external_id":"47c4da54-af32-4a91-b8a2-68f6544ae8e2","payment_service":"solidgate","active":1,"product":"c9bcdea6-c6be-4806-af1b-ccfb12e3798a","trial_start_at":null,"trial_end_at":null,"expire_at":"2026-02-22 07:04:47","canceled_at":null,"created_at":"2026-02-19 07:04:50","currency":"USD","amount":39.99,"updated_at":"2026-02-28 04:47:23","customer_email":"darshanrana036@gmail.com","email":"darshanrana036@gmail.com","sig":"c62c11e097de96053f43...
```

### GET /api/v1/payments/one-time-payment
- **Full URL**: https://astrology.astroline.app/api/v1/payments/one-time-payment
- **Response Preview**: 
```json
[]
```

### GET /api/v1/payments/one-time-payment/get-payment-method
- **Full URL**: https://astrology.astroline.app/api/v1/payments/one-time-payment/get-payment-method
- **Response Preview**: 
```json
{"payment_method":"googlepay","card_brand":"MASTERCARD","card_last_digits":"2491","payment_service":"solidgate"}
```

### GET /api/v1/astrology-questions/balance
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/balance
- **Response Preview**: 
```json
{"balance":0,"isRewardedForFirstUse":1,"isRewardedForRenew":1,"isRewardedForUnpaidUser":0,"upsaleRewards":0,"freeBalance":0,"lastTransactionDate":null}
```

### GET /api/v1/payments/subscriptions/actualized
- **Full URL**: https://astrology.astroline.app/api/v1/payments/subscriptions/actualized
- **Response Preview**: 
```json
{"data":[{"resource_type":"Subscription","id":8281895,"external_id":"47c4da54-af32-4a91-b8a2-68f6544ae8e2","payment_service":"solidgate","active":1,"product":"c9bcdea6-c6be-4806-af1b-ccfb12e3798a","trial_start_at":null,"trial_end_at":null,"expire_at":"2026-02-22 07:04:47","canceled_at":null,"created_at":"2026-02-19 07:04:50","currency":"USD","amount":39.99,"updated_at":"2026-02-28 04:47:23","customer_email":"darshanrana036@gmail.com","email":"darshanrana036@gmail.com","sig":"c62c11e097de96053f43...
```

### GET /api/v1/horoscope/all-signs
- **Full URL**: https://astrology.astroline.app/api/v1/horoscope/all-signs
- **Response Preview**: 
```json
{"zodiac":[{"name":"aquarius","date":[{"start":"20:01","end":"18:02"}]},{"name":"pisces","date":[{"start":"19:02","end":"20:03"}]},{"name":"aries","date":[{"start":"21:03","end":"19:04"}]},{"name":"taurus","date":[{"start":"20:04","end":"20:05"}]},{"name":"gemini","date":[{"start":"21:05","end":"21:06"}]},{"name":"cancer","date":[{"start":"22:06","end":"22:07"}]},{"name":"leo","date":[{"start":"23:07","end":"22:08"}]},{"name":"virgo","date":[{"start":"23:08","end":"22:09"}]},{"name":"libra","dat...
```

### GET /api/v1/horoscope
- **Full URL**: https://astrology.astroline.app/api/v1/horoscope?horoscope_type=zodiac&sign=capricorn&early=false
- **Response Preview**: 
```json
{"horoscope":[{"time_type":"before_yesterday","text":"<p>Today, Capricorn, don’t be afraid to take risks. Sure, your caution and meticulous planning are important — especially when it comes to big decisions. But sometimes, taking the plunge is all you need to move forward.</p>","quality":"default","tags":[{"tag_type_id":"love","percents":80,"text":"<p>You are going to be uncharacteristically aggressive in love today. Your partner is likely to be rather astonished because he / she is used to tend...
```

### GET /api/v1/palm/view
- **Full URL**: https://astrology.astroline.app/api/v1/palm/view
- **Response Preview**: 
```json
{"left":{"id":5092306,"type":"left","status":"full","created_at":"2026-02-19 07:04:59","path":"https://astroline.fsn1.your-objectstorage.com/uploads/palm/2026-02-19/261b8083864ee6a4e941dfa6bd97a307.jfif","result":{"core":{"lineScore":{"heart":67,"life":90,"head":48,"fate":86},"lineSuggestion":{"heart":"Your **Heart Line** reflects a strong emotional awareness. You connect deeply with others but make sure that your emotions don't overpower your judgment.","life":"Your **Life Line** shows impressi...
```

### GET /api/v1/astrology-questions/chats
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/chats
- **Response Preview**: 
```json
[{"lastMessage":{"id":169249748,"type":"answer","message":"Someone you trust – a business ally or even a romantic partner – could open the door to abundance within the next 6 months. Would you like me to look at what kind of person this partner might be? ✨","metadata":{"protected":true},"created_at":"2026-02-19 07:15:27","is_viewed":1,"is_viewed_by_user":1,"is_blurred":1},"offeredReports":[],"chatId":8188961,"astrologer_id":16,"created_at":"2026-02-19 07:09:01","unreadCount":0},{"lastMessage":{"...
```

### GET /api/v1/payments/products
- **Full URL**: https://astrology.astroline.app/api/v1/payments/products?payment_system_type=solidgate&payment_system_project=quiz&search=external_id:0ba38605-c7c4-4211-a528-be818e5f03a9,8e6e5ba5-c150-4c41-86bf-91fce9188a18,e6c0f083-5363-46df-950d-3f9a6a81bc91,378ea828-a808-4693-be6d-9fb4e7fb7c49,5723e783-6424-49f9-a089-8fdd88bf0aba,4d1744e4-cbb1-410b-930b-365e36fa372f,d000e843-a986-4141-a15a-9ecd5073944e,39edca03-7e49-4f11-9a62-09e1aab9466b,355960da-270d-46cb-b96c-14695767920f,125b4d3d-aa8a-4a4e-9c88-78fd9060b026,fe83f4ac-d174-4df6-83f1-144e5f84c4f1,f171600d-3a74-4d28-94e0-28f769fe8522,cc4f6d0f-f6c4-4d6d-98f7-cb6ef10b0214,989031c2-0a16-460d-8399-482f713d0370,42d8c481-2ee8-474a-980f-9e54f9c76214,e01e9655-30d2-4f76-bcbb-3b8ec8ca6eb3,46e7fd3f-3a59-4aa8-97a0-47b4c51178e0,144cfbca-ffc4-435e-a986-d3e66a1d47cc,50a0b472-27d2-4dcb-bff9-c534e7fde2d2,34cb34d2-f54e-4db5-920e-31e50daefbf3,67c614d0-545c-4518-aa68-9281b822da8c,106defb5-9188-4c39-97e1-ba2b5c99dbcb,a7ed47d6-1987-4ea2-b725-3d361e586b1d,600774e4-c41b-4511-a61f-73e87fecb9c6,afaff185-290a-4aac-a640-0c11e84750ed,89d525c0-0305-49c3-a179-84d4c365f1e6,eeeddc8a-63fe-4049-acd5-82387284e0a8,d542a844-3778-48f1-af9a-9e2ca037edfb,f18f2147-31c8-433a-8180-13f5e274cd62,3300f88d-3bd1-4864-a12c-6ba02cfa8863,a95787c0-d024-4180-bb47-f907dfd070b9,d71b483d-126f-4086-bab0-90d57b534b79,84ec2493-c5ed-4ff7-8ea3-3d69d42c490a,0571ada0-b27f-40ba-b7f9-4d700373bb82,1b852f68-bae7-43f3-af50-357a25a64820,b765225d-5e62-41d9-8e06-3321ac855b27,0895b402-8385-452a-9689-2bbc8d882a65,c9bcdea6-c6be-4806-af1b-ccfb12e3798a&searchFields=external_id:in
- **Response Preview**: 
```json
{"data":[{"resource_type":"Product","id":"0571ada0-b27f-40ba-b7f9-4d700373bb82","amount":"9.99","currency":"USD","type":"one_time","trial_period_days":"","trial_price_amount":"","pay_link":null,"period":null,"currencies":[{"amount":"9.99","currency":"EUR","trial_price_amount":"","country":"DEU"},{"amount":"9.99","currency":"EUR","trial_price_amount":"","country":"AUT"},{"amount":"1500","currency":"JPY","trial_price_amount":"","country":"JPN"},{"amount":"15.99","currency":"AUD","trial_price_amoun...
```

### GET /api/v1/best-matches
- **Full URL**: https://astrology.astroline.app/api/v1/best-matches
- **Response Preview**: 
```json
[{"id":62,"category":"friendship","title":"Best soulmates","description":"<p>Aries have a strong and confident personality. Retaining their dignity in any relationship is essential to them. Although they won’t try to suppress another person, they like to compete sometimes, just for fun. People born under this sign are known to be passionate about life. That’s why the Fire elements – Leo and Sagittarius – will get along really well with Aries. But don’t forget that opposites attract. Hot-tempered...
```

### GET /api/v1/biorhythms
- **Full URL**: https://astrology.astroline.app/api/v1/biorhythms
- **Response Preview**: 
```json
[{"id":165,"category":"physical","likes":6648,"dislikes":235,"order":3,"text":"<p>This is the hard time for you energetically wise. Keep physical activity a minimum, be kind and understanding to yourself. Extra carefulness in everything you do is a must.</p>"},{"id":210,"category":"intellectual","likes":6791,"dislikes":229,"order":3,"text":"<p>This is the lowest time of your mental activity. So don't rush, don't take risks, don't make important decisions. Try to calm down and go with the flow fo...
```

### GET /api/v1/dating/calendar
- **Full URL**: https://astrology.astroline.app/api/v1/dating/calendar
- **Response Preview**: 
```json
[{"date":"2026-02-01","status":null},{"date":"2026-02-02","status":null},{"date":"2026-02-03","status":"favorable"},{"date":"2026-02-04","status":null},{"date":"2026-02-05","status":"unfavorable"},{"date":"2026-02-06","status":"favorable"},{"date":"2026-02-07","status":null},{"date":"2026-02-08","status":"favorable"},{"date":"2026-02-09","status":"favorable"},{"date":"2026-02-10","status":"unfavorable"},{"date":"2026-02-11","status":"favorable"},{"date":"2026-02-12","status":null},{"date":"2026-...
```

### GET /api/v1/dating/predictions
- **Full URL**: https://astrology.astroline.app/api/v1/dating/predictions
- **Response Preview**: 
```json
[{"date":"2026-02-26","status":"favorable","ideas":{"items":[{"id":21,"content":"Go to an amusement park","lang_id":1},{"id":30,"content":"Go ice-skating","lang_id":1},{"id":32,"content":"Visit a museum","lang_id":1},{"id":55,"content":"Go to a shooting range","lang_id":1},{"id":58,"content":"Play basketball","lang_id":1}],"tooltip":""},"tips":{"items":[{"id":9,"is_positive":true,"content":"Believe in yourself"},{"id":13,"is_positive":true,"content":"Be in the moment"},{"id":17,"is_positive":tru...
```

### GET /api/v1/calendars
- **Full URL**: https://astrology.astroline.app/api/v1/calendars?year=2026&month=2&theme=DENIM
- **Response Preview**: 
```json
[{"id":162,"category":"lunar","year":2026,"month":2,"theme":"DENIM","src":"https://astroline.fsn1.your-objectstorage.com/uploads/calendars/58eb92759dd573adddd5fc920ac069cf.webp"}]
```

### GET /api/v1/tarot/history
- **Full URL**: https://astrology.astroline.app/api/v1/tarot/history
- **Response Preview**: 
```json
[{"id":4659950,"date":"2026-02-27","data":{"cardID":92},"user_id":371495410},{"id":4608415,"date":"2026-02-20","data":{"cardID":132},"user_id":371495410},{"id":4599583,"date":"2026-02-19","data":{"cardID":123},"user_id":371495410}]
```

### GET /api/v1/astronomical-events
- **Full URL**: https://astrology.astroline.app/api/v1/astronomical-events
- **Response Preview**: 
```json
[{"id":4,"planet":"mercury","tags":["Tech glitches","Miscommunication","Forgetfulness"],"description":"<p>Mercury rules communication, thinking, learning, travel, and technology. During Mercury retrograde, it's best to review past plans rather than start major new projects. Be patient and double-check all details to avoid miscommunications and delays.</p>\r\n","expect":["Misunderstandings and arguments","Delays in travel or shipping","Emails or messages getting lost","Tech glitches or data error...
```

### GET /api/v1/courses
- **Full URL**: https://astrology.astroline.app/api/v1/courses
- **Response Preview**: 
```json
[{"id":7,"category":"create_your_future","lang_id":1,"name":"How to Maintain a Long-Distance Relationship","short_name":"Maintain a Relationship","description":"<p>Long-distance love comes with their own specific difficulties. Look into practices that help you overcome challenges and make relationships absolutely succeed</p>","image":"https://astroline.fsn1.your-objectstorage.com/uploads/courses/img-1-small@3x.png_image_1600084716.png","users_count":30134,"sessions_count":7,"short_quiz_questions...
```

### GET /api/v1/approximate-location
- **Full URL**: https://astrology.astroline.app/api/v1/approximate-location
- **Response Preview**: 
```json
{"accuracy_radius":100,"latitude":19.0748,"longitude":72.8856,"time_zone":"Asia/Kolkata"}
```

### GET /api/v1/birthchart/planets
- **Full URL**: https://astrology.astroline.app/api/v1/birthchart/planets
- **Response Preview**: 
```json
[{"planet_type":"sun","description":"Your Sun sign relates to your sense of self, which speaks of your ego, your identity, your life path, and your purpose. The Sun shows you who you are at your core, who you want to become, and where you put your energy. Being the luminary of the day, the Sun illuminates the themes that you are consciously aware of and that are prominent in your life. Within your birth chart, the Sun functions as the essence of your being, shining light on your overall personal...
```

### GET /api/v1/birthchart/houses
- **Full URL**: https://astrology.astroline.app/api/v1/birthchart/houses
- **Response Preview**: 
```json
[{"house_number":1,"title":"1st house","influence":"awareness of self","planet":"Mars ","meaning":"personality, appearance, position about life, self-esteem","hemisphere":"eastern, lower  ","description":"The 1st house is the location of your ascendant or rising sign, which speaks to how you present yourself out in the world. It shows how you express yourself and how others see you, determining your behavior and character traits. \r\nThis house also speaks to your manners and physical appearance...
```

### GET /api/v1/payments/reports
- **Full URL**: https://astrology.astroline.app/api/v1/payments/reports
- **Response Preview**: 
```json
{"data":{"user_reports":[{"resource_type":"Report","id":6602137,"product_code":"soulmate","title":"Soulmate Sketch","image":"https://astroline.b-cdn.net/report_icons/sketch.png","link":"soulmate","view_type":"app_section","is_pdf":false,"type_of_issue":"sub_gift","ready_timer":0,"speed_up":null},{"resource_type":"Report","id":6602185,"product_code":"horoscope","title":"Prediction 2026 Report","image":"https://astroline.b-cdn.net/report_icons/horoscope.png","link":"https://year-forecast.astroline...
```

### GET /api/v1/astrology-questions/suggests
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/suggests
- **Response Preview**: 
```json
{"love":{"id":1,"title":"Love","slug":"love","priority":1,"questions":{"1":{"text":"When will I find my soulmate?","type":null},"4":{"text":"Does my partner love me?","type":null},"7":{"text":"How do I find my true love?","type":null},"10":{"text":"Are we going to be together?","type":null},"13":{"text":"Should I get back with my ex?","type":null},"16":{"text":"Will my ex call me?","type":null},"19":{"text":"Is my partner cheating on me?","type":null},"22":{"text":"Should I break up with him?","...
```

### GET /api/v1/moon-calendar/widget
- **Full URL**: https://astrology.astroline.app/api/v1/moon-calendar/widget?sign=cancer
- **Response Preview**: 
```json
{"moon_phase":"Waxing Gibbous","sign":"cancer","moon_phases_dates":[{"date":"2026-02-17","phase":"new-moon"},{"date":"2026-02-24","phase":"first-quarter"},{"date":"2026-04-02","phase":"full-moon"},{"date":"2026-04-10","phase":"last-quarter"}],"ritual":{"id":12,"moon_phase":"waxing-gibbous","day_number":null,"lang_id":"1","name":"Visit a hairdresser","description":"Cutting your hair during the Waxing Moon helps it grow faster, stronger, and healthier."}}
```

### GET /api/v1/moon-calendar/predictions
- **Full URL**: https://astrology.astroline.app/api/v1/moon-calendar/predictions?sign=cancer
- **Response Preview**: 
```json
[{"date":"2026-02-26","sign":"cancer","phase":{"id":33,"moon_phase":"waxing-gibbous","lang_id":1,"name":"Waxing Gibbous Moon","description":"The Waxing Gibbous Moon occurs when the Moon is more than half full and growing brighter each night. In astrology, it’s a time for refining your goals, staying focused, and making improvements before reaching a peak or result."},"ritual":{"item":{"id":12,"moon_phase":"waxing-gibbous","day_number":null,"lang_id":"1","name":"Visit a hairdresser","description"...
```

### POST /api/birthchart
- **Full URL**: https://bcs-htz.astroline.app/api/birthchart
- **Request Payload Preview**: {"birth":{"date":"2000-01-01","time":"19:25","location":{"name":"Bharuch, Gujarat, India","lat":21.7...
- **Response Preview**: 
```json
{"success":true,"data":{"planetsWithSignsAndHouses":[{"name":"ascendant","sign":"cancer","house":1},{"name":"jupiter","sign":"aries","house":10},{"name":"mars","sign":"aquarius","house":8},{"name":"mercury","sign":"capricorn","house":6},{"name":"moon","sign":"scorpio","house":4},{"name":"neptune","sign":"aquarius","house":7},{"name":"pluto","sign":"sagittarius","house":5},{"name":"saturn","sign":"taurus","house":10},{"name":"sun","sign":"capricorn","house":6},{"name":"uranus","sign":"aquarius","...
```

### POST /api/transits
- **Full URL**: https://bcs-htz.astroline.app/api/transits
- **Request Payload Preview**: {"birth":{"date":"2000-01-01","time":"19:25","location":{"name":"Bharuch, Gujarat, India","lat":21.7...
- **Response Preview**: 
```json
{"success":true,"data":{"currentPlanets":[{"name":"sun","sign":"pisces","dms30":9.6,"dms360":339.6},{"name":"moon","sign":"cancer","dms30":27.96,"dms360":117.96},{"name":"mercury","sign":"pisces","dms30":22.27,"dms360":352.27},{"name":"venus","sign":"pisces","dms30":22.22,"dms360":352.22},{"name":"mars","sign":"aquarius","dms30":28.11,"dms360":328.11},{"name":"jupiter","sign":"cancer","dms30":15.28,"dms360":105.28},{"name":"saturn","sign":"aries","dms30":1.63,"dms360":1.63},{"name":"uranus","sig...
```

### GET /api/v1/soulmate/view
- **Full URL**: https://astrology.astroline.app/api/v1/soulmate/view
- **Response Preview**: 
```json
{"id":59615,"soulmate":"https://astroline.fsn1.your-objectstorage.com/uploads/soulmate_report/64c41ff9-3ac2-42e8-9f19-1601d023e5ae.jpg","charts":{"your_chart":{"moon_sign":"aries","sun_sign":"scorpio","ascendant":"gemini"},"soulmate_chart":{"moon_sign":"leo","sun_sign":"pisces","ascendant":"libra"},"why_you_resonate":{"sun_text":"An unspoken emotional understanding. You resonate on a deep, intuitive level, validating each other's feelings without words.","moon_text":"You find comfort in action a...
```

### GET /api/v1/astronomical-events/retrograde-of-the-day
- **Full URL**: https://astrology.astroline.app/api/v1/astronomical-events/retrograde-of-the-day
- **Response Preview**: 
```json
{"id":4,"planet":"mercury","tags":["Tech glitches","Miscommunication","Forgetfulness"],"description":"<p>Mercury rules communication, thinking, learning, travel, and technology. During Mercury retrograde, it's best to review past plans rather than start major new projects. Be patient and double-check all details to avoid miscommunications and delays.</p>\r\n","expect":["Misunderstandings and arguments","Delays in travel or shipping","Emails or messages getting lost","Tech glitches or data errors...
```

### GET /api/v1/whatsapp/account
- **Full URL**: https://astrology.astroline.app/api/v1/whatsapp/account
- **Response Preview**: 
```json
{"account":"35799274595"}
```

### GET /api/v1/events/retrieve
- **Full URL**: https://astrology.astroline.app/api/v1/events/retrieve
- **Response Preview**: 
```json
{"events":[],"statuses":{"advisorsTyping":[],"chatsTyping":[],"chatsRecording":[],"chatsSendingPhoto":[]}}
```

### POST /api/horoscopes-transits
- **Full URL**: https://bcs-htz.astroline.app/api/horoscopes-transits
- **Request Payload Preview**: {"birth":{"date":"2000-01-01","time":"19:25","location":{"name":"Bharuch, Gujarat, India","lat":21.7...
- **Response Preview**: 
```json
{"success":true,"data":{"today":[{"natalPlanet":"pluto","transitPlanet":"sun","aspect":"square","influence":"negative","start":"2026-02-25T00:00:00+05:30","end":"2026-03-06T00:00:00+05:30"},{"natalPlanet":"jupiter","transitPlanet":"moon","aspect":"square","influence":"negative","start":"2026-02-27T00:00:00+05:30","end":"2026-02-28T00:00:00+05:30"},{"natalPlanet":"mars","transitPlanet":"mars","aspect":"conjunction","influence":"blended","start":"2026-02-23T00:00:00+05:30","end":"2026-03-06T00:00:...
```

### GET /api/v1/transits
- **Full URL**: https://astrology.astroline.app/api/v1/transits
- **Response Preview**: 
```json
[{"id":507,"lang_id":1,"natal_planet":"sun","transit_planet":"sun","type":"CONJUNCTION","text":"The Sun’s conjunction with your natal Sun brings a heightened sense of self-awareness and a strong urge to express your individuality. You may feel more confident and in touch with your needs and desires, but be careful not to let this turn into arrogance.\nThis transit can also bring opportunities for success in your professional life, as long as you maintain a healthy balance between self-expression...
```

### GET /api/v1/birthchart/aspects
- **Full URL**: https://astrology.astroline.app/api/v1/birthchart/aspects
- **Response Preview**: 
```json
[{"type":"CONJUNCTION","description":"When two planets are in the same sign on your birth chart, it’s called a conjunction. This brings a powerful fusion of energy, amplifying the qualities of both planets. Depending on the planets involved, a conjunction can bring intense passion, focus, or a drive for success in a certain area of life."},{"type":"OPPOSITION","description":"An opposition occurs when two planets are on the exact opposite sides of your birth chart. This can create tension and a n...
```

### POST /api/v1/horoscope/generate
- **Full URL**: https://astrology.astroline.app/api/v1/horoscope/generate
- **Request Payload Preview**: {"enableHeader":true,"period":["day"],"date":"2026-02-28","pid":2,"natalPlanets":[{"name":"sun","sig...
- **Response Preview**: 
```json
[{"id":45827021,"date":"2026-02-28","period":"day","data":{"powerAndFocus":"ambition, responsibility, growth","troubles":"emotional tension, miscommunication, impatience","header":"Navigating emotional energies","blocks":[{"title":"Harness Your Ambition","text":"As Mars aligns with your natal placement, focus on channeling energy into your projects. This is a great period for tangible achievements, yet avoid rushing decisions. Instead, set practical goals while considering emotional well-being."...
```

### GET /api/v1/tip
- **Full URL**: https://astrology.astroline.app/api/v1/tip
- **Response Preview**: 
```json
[{"id":21,"lang_id":1,"category":"warnings","likes":7557,"dislikes":321,"text":"<p>It seems like you try to cram as much as possible into every day, but it doesn’t provide a sense of satisfaction.</p>"},{"id":162,"lang_id":1,"category":"love","likes":7408,"dislikes":366,"text":"<p>Self-love is the most important inner resource. It helps people to build long-term, happy relationships.</p>"},{"id":274,"lang_id":1,"category":"work","likes":6508,"dislikes":200,"text":"<p>People rarely succeed unless...
```

### POST /api/transit-duration
- **Full URL**: https://bcs-htz.astroline.app/api/transit-duration
- **Request Payload Preview**: {"transit":{"transitPlanet":{"name":"sun","sign":"pisces","dms30":0.66,"dms360":330.66},"natalPlanet...
- **Response Preview**: 
```json
{"success":true,"data":{"start":"2026-02-19T00:00:00+05:30","end":"2026-02-19T00:00:00+05:30"},"errors":[]}
```

## File: app.astroline-advisors-2-clean.har

### GET /api/v1/astrology-questions/chats
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/chats
- **Response Preview**: 
```json
[{"lastMessage":{"id":169249748,"type":"answer","message":"Someone you trust – a business ally or even a romantic partner – could open the door to abundance within the next 6 months. Would you like me to look at what kind of person this partner might be? ✨","metadata":{"protected":true},"created_at":"2026-02-19 07:15:27","is_viewed":1,"is_viewed_by_user":1,"is_blurred":1},"offeredReports":[],"chatId":8188961,"astrologer_id":16,"created_at":"2026-02-19 07:09:01","unreadCount":0},{"lastMessage":{"...
```

### POST /collector/event
- **Full URL**: https://evtruck.magnus.ms/collector/event
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### GET /api/v1/events/retrieve
- **Full URL**: https://astrology.astroline.app/api/v1/events/retrieve
- **Response Preview**: 
```json
{"events":[],"statuses":{"advisorsTyping":[],"chatsTyping":[],"chatsRecording":[],"chatsSendingPhoto":[]}}
```

### POST /api/v1/astrology-questions/create-question
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/create-question
- **Request Payload Preview**: {"question":"Hello! Is my partner cheating on me?","metadata":"{\"type\":\"suggest\",\"source\":\"ad...
- **Response Preview**: 
```json
null
```

### GET /api/v1/astrology-questions/balance
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/balance
- **Response Preview**: 
```json
{"balance":0,"isRewardedForFirstUse":1,"isRewardedForRenew":1,"isRewardedForUnpaidUser":0,"upsaleRewards":0,"freeBalance":0,"lastTransactionDate":null}
```

### POST /api/v1/astrology-questions/start
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/start
- **Request Payload Preview**: {"astrologer_id":20,"needResponse":1,"message":"","platform":"rnw","metadata":{"notificationCategory...
- **Response Preview**: 
```json
{"chat_id":8327817,"is_unlimited":false}
```

### GET /api/v1/astrology-questions/messages
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/messages?astrologer_id=20&page=1
- **Response Preview**: 
```json
null
```

### GET /api/v1/payments/one-time-payment/get-payment-method
- **Full URL**: https://astrology.astroline.app/api/v1/payments/one-time-payment/get-payment-method
- **Response Preview**: 
```json
{"payment_method":"googlepay","card_brand":"MASTERCARD","card_last_digits":"2491","payment_service":"solidgate"}
```

### POST /api/v1/astrology-questions/charge-time
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/charge-time
- **Request Payload Preview**: {"seconds":0,"chatId":0}...
- **Response Preview**: 
```json
{"balance":0,"freeBalance":0,"error":"Not enough time"}
```

### GET /api/profile
- **Full URL**: https://evtruck.magnus.ms/api/profile?idfm=80cb6ec0-f885-11f0-8530-bdc4cb22a3e1
- **Response Preview**: 
```json
{"last_web_install":{"project_id":599,"idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","install_time":"2026-02-20 05:15:04","utm_source":"Facebook_Web","campaign_name":"{{campaign.name}}","campaign_id":"{{campaign.id}}","adset_name":"{{adset.name}}","adset_id":"{{adset.id}}","ad_name":"{{ad.name}}","ad_id":"{{ad.id}}","ad_subnetwork":"{{site_source_name}}","ad_keyword":"","ad_placement":"{{placement}}","url":"https://sub.astroline.today/intro?creative_topic=moon"}}
```

### POST /api/v1/astrology-questions/log
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/log
- **Request Payload Preview**: {"chatId":8327817,"data":{"reason":"chat_end","balance":0},"type":"endChat"}...
- **Response Preview**: 
```json
null
```

### POST /api/v1/astrology-questions/view
- **Full URL**: https://astrology.astroline.app/api/v1/astrology-questions/view
- **Request Payload Preview**: {"astrologer_id":20}...
- **Response Preview**: 
```json
null
```

### GET /api/v1/whatsapp/account
- **Full URL**: https://astrology.astroline.app/api/v1/whatsapp/account
- **Response Preview**: 
```json
{"account":"35799274595"}
```

### POST /api/v1/auth
- **Full URL**: https://astrology.astroline.app/api/v1/auth
- **Request Payload Preview**: {"device_id":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1"}...
- **Response Preview**: 
```json
{"profile":{"id":371495410,"name":"You","access_token":"VrXMRjpaVJaeILN1Cr_l7_zrjIo5HlQW","device_id":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","device_id_new":null,"gender":0,"birthdate":"2000-01-01","marital_status":0,"birthtime":1165,"utc_offset":5,"birth_place":"Bharuch, Gujarat, India","lat":21.7080427,"lon":72.9956936,"is_migrated":0,"is_unsubscriber":1,"full_language_code":"en","lang":"en","email":"darshanrana036@gmail.com","data":{"time_format":"12","withAccountManage":true,"show_subscripti...
```

### GET /api/v1/payments/one-time-payment
- **Full URL**: https://astrology.astroline.app/api/v1/payments/one-time-payment
- **Response Preview**: 
```json
[]
```

## File: app.astroline-features-3-clean.har

### POST /collector/event
- **Full URL**: https://evtruck.magnus.ms/collector/event
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### GET /api/v1/events/retrieve
- **Full URL**: https://astrology.astroline.app/api/v1/events/retrieve
- **Response Preview**: 
```json
{"events":[],"statuses":{"advisorsTyping":[],"chatsTyping":[],"chatsRecording":[],"chatsSendingPhoto":[]}}
```

### POST /api/v1/stories/view
- **Full URL**: https://astrology.astroline.app/api/v1/stories/view
- **Request Payload Preview**: {"story_id":411}...
- **Response Preview**: 
```json
{"success":true}
```

## File: app.astroline-compatibility-4-clean.har

### POST /collector/event
- **Full URL**: https://evtruck.magnus.ms/collector/event
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### GET /api/v1/events/retrieve
- **Full URL**: https://astrology.astroline.app/api/v1/events/retrieve
- **Response Preview**: 
```json
{"events":[],"statuses":{"advisorsTyping":[],"chatsTyping":[],"chatsRecording":[],"chatsSendingPhoto":[]}}
```

### GET /api/v1/compatibility-v2
- **Full URL**: https://astrology.astroline.app/api/v1/compatibility-v2?first_sign=capricorn&second_sign=aquarius
- **Response Preview**: 
```json
{"first_sign":{"id":1,"type":"zodiac","sign":"aquarius","element_id":4,"modality_id":6,"polarity_id":8,"ruling_planet_id":10,"element":{"id":4,"type":"element","code":"air","created_at":"2022-06-15 12:30:50","updated_at":"2022-06-15 12:30:50"}},"second_sign":{"id":12,"type":"zodiac","sign":"capricorn","element_id":1,"modality_id":5,"polarity_id":9,"ruling_planet_id":10,"element":{"id":1,"type":"element","code":"earth","created_at":"2022-06-15 12:30:50","updated_at":"2022-06-15 12:30:50"}},"overv...
```

## File: app.astroline-birthchart-5-clean.har

### GET /api/v1/events/retrieve
- **Full URL**: https://astrology.astroline.app/api/v1/events/retrieve
- **Response Preview**: 
```json
{"events":[],"statuses":{"advisorsTyping":[],"chatsTyping":[],"chatsRecording":[],"chatsSendingPhoto":[]}}
```

### POST /collector/event
- **Full URL**: https://evtruck.magnus.ms/collector/event
- **Request Payload Preview**: {"platform":"web","idfm":"80cb6ec0-f885-11f0-8530-bdc4cb22a3e1","idfa":"","idfv":"","uid":"80cb6ec0-...
- **Response Preview**: 
```json
{"status":"ok"}
```

### POST /api/v1/stories/view
- **Full URL**: https://astrology.astroline.app/api/v1/stories/view
- **Request Payload Preview**: {"story_id":1373}...
- **Response Preview**: 
```json
{"success":true}
```

### POST /api/transit-duration
- **Full URL**: https://bcs-htz.astroline.app/api/transit-duration
- **Request Payload Preview**: {"transit":{"transitPlanet":{"name":"sun","sign":"pisces","dms30":9.61,"dms360":339.61},"natalPlanet...
- **Response Preview**: 
```json
{"success":true,"data":{"start":"2026-02-24T00:00:00+05:30","end":"2026-03-05T00:00:00+05:30"},"errors":[]}
```

