# Demo notes — temperature converter

1. Open <http://localhost:8000>. The three result tiles show a dash until a value is entered.
2. With Celsius selected, type `100`. The results update as you type: 100 °C, 212 °F, 373.15 K.
3. Click "Convert". The status line confirms "Converted 100 °C — showing all three units."
4. Select "Fahrenheit" and type `32`. The results show 0 °C, 32 °F, 273.15 K. The unit badge inside the input changes to °F.
5. Select "Kelvin" and type `0`. The results show −273.15 °C, −459.67 °F, 0 K.
6. Back on Celsius, type `-300`. A red alert says the value is below absolute zero and the result tiles are cleared.
7. Type `-273.15`. This is accepted as the absolute-zero boundary: 0 K, with no error.
8. With a valid value in the field, press Enter. The form submits and converts without clicking the button.
9. Try typing letters into the field. The number input blocks them and the alert explains that only digits, a decimal point and a minus sign work.
10. Clear the field and click "Convert". A friendly message asks for a value and gives an example.
11. Click "Reset". The input, results, unit selection and error all return to their starting state, and the cursor goes back to the input.
12. Press Tab from the top. The unit radios are reachable with the arrow keys and every control shows a visible focus ring.
13. Resize the window to 360px wide. The unit choices stay in one row, result tiles become full-width rows, and there is no horizontal scroll.
