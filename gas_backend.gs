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
    // 強制轉為小寫並去除空白，防止 iOS 鍵盤自動首字大寫（例如打成 "Exit"）
    const action = data.action ? data.action.toString().toLowerCase().trim() : ""; 
    const timestampStr = data.timestamp; 
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RAW);
    
    if (!sheet) {
      return jsonResponse({status: "error", message: "找不到 RawData 工作表"});
    }
    
    const now = new Date();
    
    // ======== 如果是入場 ========
    if (action === "entry") {
      sheet.appendRow([Utilities.getUuid(), now, "entry", ""]);
      return jsonResponse({status: "success", action: "entry", time: now});
    }
    
    // ======== 如果是出場 ========
    if (action === "exit") {
      const lastRow = sheet.getLastRow();
      if (lastRow < 1) return jsonResponse({status: "error", message: "表單完全是空的"});
      
      // 直接從第 1 列讀到最後一列，不管有沒有留標題列 (Header) 都不會壞
      const values = sheet.getRange(1, 1, lastRow, 4).getValues();
      let lastEntryIndex = -1;
      for (let i = values.length - 1; i >= 0; i--) {
        // 確保這筆是 entry 且欄位 4 沒有紀錄到結算的分鐘數
        if (values[i][2] === "entry" && (values[i][3] === "" || values[i][3] === null || values[i][3] === undefined)) {
          lastEntryIndex = i;
          break;
        }
      }
      
      if (lastEntryIndex === -1) {
        sheet.appendRow(["ERROR", now, "exit_failed", "找不到未結算的 entry 紀錄"]);
        return jsonResponse({status: "error", message: "找不到對應的尚未結算的入場紀錄"});
      }
      
      const entryTime = new Date(values[lastEntryIndex][1]);
      const diffMs = now.getTime() - entryTime.getTime();
      const diffMins = Math.round(diffMs / 60000); 
      
      // 由於 lastEntryIndex 是從 0 開始，對應到試算表列數就是 lastEntryIndex + 1
      sheet.getRange(lastEntryIndex + 1, 4).setValue(diffMins);
      sheet.appendRow([Utilities.getUuid(), now, "exit", diffMins]);
      
      return jsonResponse({status: "success", action: "exit", minutes: diffMins});
    }
    
    // 若不是 entry 也不是 exit，可能是打錯字！寫入除錯紀錄
    sheet.appendRow(["ERROR", now, "unknown_action", `收到未知的 action: [${data.action}]`]);
    return jsonResponse({status: "error", message: "Unknown action", received: action});
    
  } catch(err) {
    // 若是程式徹底死了（例如 JSON 解析失敗），也盡可能留下紀錄
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RAW);
      sheet.appendRow(["FATAL_ERROR", new Date(), "crash", err.toString()]);
    } catch(e) {}
    
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
          if (timeSpent && typeof timeSpent === 'number') {
            totalMinutes += timeSpent;
          }
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
