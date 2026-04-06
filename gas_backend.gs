// 部署前設定：請確保您的 Google Sheet 分頁名稱有以下兩張表：
// 1. RawData
// 2. MonthlySummary (如果沒有自動加總，這邊會用程式動態幫您算)

const SHEET_NAME_RAW = "RawData";

/**
 * HTTP POST 進入點
 * 給 iOS 捷徑送資料 (入場/出場) 用的
 */
function doPost(e) {
  try {
    const rawContent = e.postData.contents;
    const data = JSON.parse(rawContent);
    const action = data.action; // "entry" 或是 "exit"
    const timestampStr = data.timestamp; // "2026-04-06 18:00:00" 或單純交給 GAS 去生
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RAW);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "找不到 RawData 工作表"}))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    const now = new Date();
    
    // 如果是入場
    if (action === "entry") {
      // 假設欄位 [UUID, 日期時間, 動作, 單次花費時間]
      // 寫入: [ UUID(), now, "entry", "" ]
      sheet.appendRow([Utilities.getUuid(), now, "entry", ""]);
      return jsonResponse({status: "success", action: "entry", time: now});
    }
    
    // 如果是出場
    if (action === "exit") {
      // 處理邏輯：找最後一筆且動作為 "entry" 的紀錄配對
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonResponse({status: "error", message: "沒有入場紀錄"});
      
      const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      // 從後面往前找最後一次 entry
      let lastEntryIndex = -1;
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][2] === "entry" && !values[i][3]) {
          lastEntryIndex = i;
          break;
        }
      }
      
      if (lastEntryIndex === -1) {
        return jsonResponse({status: "error", message: "找不到對應的尚未結算的入場紀錄"});
      }
      
      const entryTime = new Date(values[lastEntryIndex][1]);
      const diffMs = now.getTime() - entryTime.getTime();
      const diffMins = Math.round(diffMs / 60000); // 計算經過的分鐘數
      
      // 更新那筆資料的回傳時間
      sheet.getRange(lastEntryIndex + 2, 4).setValue(diffMins);
      // 再寫一筆 exit 作為紀錄追蹤（選配，如果你只要有時間就好也可不寫）
      sheet.appendRow([Utilities.getUuid(), now, "exit", 0]);
      
      return jsonResponse({status: "success", action: "exit", minutes: diffMins});
    }
    
    return jsonResponse({status: "error", message: "Unknown action"});
    
  } catch(err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

/**
 * HTTP GET 進入點
 * 給你的 HTML 首頁讀取當月資料用的
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RAW);
    if (!sheet) return jsonResponse({totalMinutes: 0, visits: 0});
    
    const lastRow = sheet.getLastRow();
    if(lastRow < 2) return jsonResponse({totalMinutes: 0, visits: 0});
    
    const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalMinutes = 0;
    let visits = 0;
    
    for(let i = 0; i < values.length; i++) {
      const recordDate = new Date(values[i][1]);
      const action = values[i][2];
      const timeSpent = values[i][3]; // 這個是我們在出廠時算在 entry 那列的時間
      
      // 確保是當月
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        if (action === "entry") {
          visits += 1;
        }
        if (timeSpent && typeof timeSpent === 'number') {
          totalMinutes += timeSpent;
        }
      }
    }
    
    // 解決跨網域 AJAX (CORS) 與 JSON 回傳的問題
    const response = {
      totalMinutes: totalMinutes,
      visits: visits
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return jsonResponse({error: err.toString()});
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
