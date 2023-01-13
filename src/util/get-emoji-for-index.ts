export default function getEmojiForIndex(i: number): string {
  switch (i) {
    case 0:
      return ":first_place: ";
    case 1:
      return ":second_place: ";
    case 2:
      return ":third_place: ";
    case 3:
      return ":four: ";
    case 4:
      return ":five: ";
    case 5:
      return ":six: ";
    case 6:
      return ":seven: ";
    case 7:
      return ":eight: ";
    case 8:
      return ":nine: ";
    case 9:
      return ":keycap_ten: ";
    default:
      return `${i + 1}. `;
  }
}
