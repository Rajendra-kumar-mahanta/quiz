const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create or Update Admin User
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'rajendrakumarmahanta22@gmail.com';
  const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      name: 'Rajendra Kumar Mahanta',
      role: 'SUPERADMIN'
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: 'Rajendra Kumar Mahanta',
      role: 'SUPERADMIN'
    }
  });
  console.log(`✅ Admin account created/updated: ${admin.email}`);

  // 2. Check if Demo Quiz already exists
  const existingQuiz = await prisma.quiz.findFirst({
    where: { title: 'Robotics and Arduino Workshop Challenge' }
  });

  if (existingQuiz) {
    console.log('ℹ️  Robotics and Arduino Workshop Challenge already exists. Skipping duplicate creation.');
    return;
  }

  // 3. Create Sample Quiz: Robotics and Arduino Workshop Challenge
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Robotics and Arduino Workshop Challenge',
      description: 'The official live technical competition quiz for the B.Tech Robotics & Arduino Workshop. Test your knowledge on Sense-Decide-Act loops, Arduino Uno hardware, microcontrollers, embedded C++, sensors, IR decoding, and non-blocking timing.',
      subject: 'Robotics / Embedded Systems',
      defaultDuration: 30,
      baseMarks: 10,
      maxBonus: 10,
      negativeMarking: false,
      negativeMarks: 0,
      shuffleQuestions: false,
      shuffleOptions: false,
      showAnswerAfterQuestion: true,
      showLeaderboardAfterQuestion: true,
      allowLateJoin: true,
      showPersonalScore: true,
      instructions: '1. Each question lasts 30 seconds.\n2. Correct answers earn 10 Base Marks plus up to 10 Speed Bonus Marks based on remaining time: floor(remaining_sec / 3).\n3. Incorrect or unanswered questions receive 0 marks.\n4. Server timestamp strictly enforces submission deadlines.',
      questions: {
        create: [
          {
            displayOrder: 1,
            text: 'What fundamental triad describes the core operational loop of an autonomous robotic system?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Robotics Fundamentals',
            points: 10,
            duration: 30,
            explanation: 'The Sense-Decide-Act loop is the foundational operational model of robotics: Sensors perceive the environment, the Controller/MCU processes data and decides, and Actuators execute physical movement.',
            options: {
              create: [
                { text: 'Sense — Decide — Act', isCorrect: true, order: 1 },
                { text: 'Power — Compute — Terminate', isCorrect: false, order: 2 },
                { text: 'Receive — Broadcast — Listen', isCorrect: false, order: 3 },
                { text: 'Compile — Flash — Reset', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 2,
            text: 'Which of the following components is classified as an ACTUATOR in a robotics platform?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Sensors & Actuators',
            points: 10,
            duration: 30,
            explanation: 'Actuators convert electrical energy into physical mechanical movement or action. DC gear motors, servo motors, and stepper motors are actuators, whereas Ultrasonic sensors, LDRs, and IMUs are sensors (inputs).',
            options: {
              create: [
                { text: 'Ultrasonic HC-SR04 Module', isCorrect: false, order: 1 },
                { text: 'N20 DC Gear Motor', isCorrect: true, order: 2 },
                { text: 'Photoresistor (LDR)', isCorrect: false, order: 3 },
                { text: 'TSOP1738 IR Receiver', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 3,
            text: 'What distinguishes an Autonomous Robot from a Remote-Controlled (RC) vehicle?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Autonomous Systems',
            points: 10,
            duration: 30,
            explanation: 'Autonomous robots execute real-time decision-making independently using onboard sensors and programmed logic without continuous human operator control.',
            options: {
              create: [
                { text: 'Autonomous robots must always be connected to a high-voltage AC wall outlet', isCorrect: false, order: 1 },
                { text: 'Autonomous robots make real-time decisions using onboard sensor feedback and algorithms without human intervention', isCorrect: true, order: 2 },
                { text: 'Remote-controlled systems cannot use microcontrollers', isCorrect: false, order: 3 },
                { text: 'Autonomous robots only operate in simulated environments like Wokwi', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 4,
            text: 'Which statement accurately describes the primary difference between a Microcontroller (e.g., ATmega328P) and a Microprocessor (e.g., Intel Core i7 / ARM Cortex-A)?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'Embedded Architecture',
            points: 10,
            duration: 30,
            explanation: 'A microcontroller integrates the CPU, RAM, ROM/Flash memory, and I/O peripherals onto a single silicon chip, designed for dedicated real-time control tasks, whereas microprocessors require external RAM, ROM, and chipset peripherals.',
            options: {
              create: [
                { text: 'Microcontrollers have integrated CPU, RAM, Flash memory, and I/O peripherals on a single chip', isCorrect: true, order: 1 },
                { text: 'Microprocessors can only run C++ code, while microcontrollers execute pure Python', isCorrect: false, order: 2 },
                { text: 'Microcontrollers require external DDR RAM modules to execute instructions', isCorrect: false, order: 3 },
                { text: 'Microprocessors consume less power and lack clock crystals', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 5,
            text: 'What is the main microcontroller chip and standard crystal oscillator frequency on a standard Arduino Uno R3 board?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Arduino Hardware',
            points: 10,
            duration: 30,
            explanation: 'The standard Arduino Uno R3 utilizes the 8-bit Microchip/Atmel ATmega328P microcontroller running at a 16 MHz clock frequency with a 5V logic level.',
            options: {
              create: [
                { text: 'ATmega328P operating at 16 MHz', isCorrect: true, order: 1 },
                { text: 'ESP32 operating at 240 MHz', isCorrect: false, order: 2 },
                { text: 'ARM Cortex-M4 operating at 80 MHz', isCorrect: false, order: 3 },
                { text: 'ATmega2560 operating at 8 MHz', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 6,
            text: 'Why is Wokwi simulator widely utilized in robotics and embedded systems workshops?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Simulation & Tools',
            points: 10,
            duration: 30,
            explanation: 'Wokwi provides a fast browser-based simulator for Arduino, ESP32, Raspberry Pi Pico, and electronic components without requiring physical hardware installation or driver configuration.',
            options: {
              create: [
                { text: 'It enables instant browser-based simulation of Arduino code, wiring, sensors, and actuators without physical hardware', isCorrect: true, order: 1 },
                { text: 'It automatically turns Arduino into a mechanical 3D printer', isCorrect: false, order: 2 },
                { text: 'It replaces C++ with machine language assembly exclusively', isCorrect: false, order: 3 },
                { text: 'It physically solders breadboard wires remotely over Bluetooth', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 7,
            text: 'In an Arduino C++ sketch, how many times does the setup() function execute after power-up or a hardware reset?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Arduino Core',
            points: 10,
            duration: 30,
            codeSnippet: 'void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  // What happens next?\n}',
            explanation: 'The setup() function is called exactly once upon board power-up or whenever the reset button is pressed. It is used to initialize pin modes, start serial communications, and set initial variables.',
            options: {
              create: [
                { text: 'Exactly once', isCorrect: true, order: 1 },
                { text: 'Repeatedly in an infinite loop', isCorrect: false, order: 2 },
                { text: 'Every 1000 milliseconds', isCorrect: false, order: 3 },
                { text: 'Only when digital pin 13 receives 5V', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 8,
            text: 'Which built-in function configures an Arduino digital pin to provide 5V power to drive an external LED or circuit component?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Digital I/O',
            points: 10,
            duration: 30,
            codeSnippet: '// How to configure pin 8 as an output?\npinMode(8, _______);',
            explanation: 'pinMode(pin, OUTPUT) configures the specified GPIO pin to low impedance mode, enabling it to source up to ~20-40mA of current at 5V.',
            options: {
              create: [
                { text: 'pinMode(8, OUTPUT);', isCorrect: true, order: 1 },
                { text: 'digitalWrite(8, HIGH);', isCorrect: false, order: 2 },
                { text: 'analogRead(8, OUTPUT);', isCorrect: false, order: 3 },
                { text: 'setPinMode(8, EMIT);', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 9,
            text: 'What is the electrical purpose of placing a current-limiting resistor (e.g. 220Ω - 330Ω) in series with an LED connected to an Arduino digital pin?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Electronics & Hardware',
            points: 10,
            duration: 30,
            explanation: 'LEDs are diodes with very low internal resistance once their forward voltage threshold is exceeded. Without a current-limiting resistor (Ohm\'s Law: I = (V_pin - V_led) / R), excessive current will burn out the LED and damage the Arduino GPIO pin driver.',
            options: {
              create: [
                { text: 'To prevent excessive current draw that would destroy the LED and damage the microcontroller pin', isCorrect: true, order: 1 },
                { text: 'To step up the voltage from 5V to 12V', isCorrect: false, order: 2 },
                { text: 'To convert digital signals into an analog audio frequency', isCorrect: false, order: 3 },
                { text: 'To invert the LED polarity automatically', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 10,
            text: 'Identify the Anode and Cathode terminals of a standard through-hole 5mm LED:',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Electronics & Hardware',
            points: 10,
            duration: 30,
            explanation: 'The Anode is the longer leg representing the positive (+) terminal, and the Cathode is the shorter leg (with a flat spot on the plastic lens casing) representing the negative (-) terminal.',
            options: {
              create: [
                { text: 'Anode = Longer leg (Positive +), Cathode = Shorter leg (Negative -)', isCorrect: true, order: 1 },
                { text: 'Anode = Shorter leg (Negative -), Cathode = Longer leg (Positive +)', isCorrect: false, order: 2 },
                { text: 'Both legs are identical and polarity does not matter for LEDs', isCorrect: false, order: 3 },
                { text: 'Cathode connects to 5V power, Anode connects to Ground always', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 11,
            text: 'What major drawback occurs when using delay(1000) inside an Arduino robotics control loop?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'Timing & Architecture',
            points: 10,
            duration: 30,
            explanation: 'delay() is a blocking call that keeps the processor in a busy-wait loop. During this time, the MCU cannot process sensor inputs, read buttons, respond to IR signals, or adjust motor control.',
            options: {
              create: [
                { text: 'It completely freezes the microcontroller, preventing it from reading sensor inputs or executing other tasks during the delay', isCorrect: true, order: 1 },
                { text: 'It erases the EEPROM memory permanently', isCorrect: false, order: 2 },
                { text: 'It decreases the clock speed of the ATmega328P to 1 Hz', isCorrect: false, order: 3 },
                { text: 'It inverts all digital output voltages immediately', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 12,
            text: 'Which Arduino C++ function returns the number of milliseconds elapsed since the board began running the current program, enabling non-blocking timing?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'Timing & Architecture',
            points: 10,
            duration: 30,
            codeSnippet: 'unsigned long currentMillis = _______();\nif (currentMillis - previousMillis >= interval) {\n  previousMillis = currentMillis;\n  toggleLED();\n}',
            explanation: 'millis() returns an unsigned 32-bit integer (unsigned long) counting milliseconds since startup. It overflows/rolls over after approximately 50 days and is the gold standard for non-blocking multi-tasking on Arduino.',
            options: {
              create: [
                { text: 'millis()', isCorrect: true, order: 1 },
                { text: 'microsTime()', isCorrect: false, order: 2 },
                { text: 'getSystemClock()', isCorrect: false, order: 3 },
                { text: 'delayTimer()', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 13,
            text: 'What is the output of the following C++ code snippet commonly used in Arduino LED chaser patterns?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'Embedded C++',
            points: 10,
            duration: 30,
            codeSnippet: 'int ledPins[] = {2, 4, 6, 8};\nint count = sizeof(ledPins) / sizeof(ledPins[0]);\n\nfor (int i = 0; i < count; i++) {\n  pinMode(ledPins[i], OUTPUT);\n}',
            explanation: 'The sizeof(ledPins) is 8 bytes (4 ints * 2 bytes on AVR), divided by sizeof(ledPins[0]) (2 bytes), yielding count = 4. The loop iterates 4 times for indices 0, 1, 2, 3, configuring pins 2, 4, 6, and 8.',
            options: {
              create: [
                { text: 'Configures digital pins 2, 4, 6, and 8 as OUTPUT', isCorrect: true, order: 1 },
                { text: 'Configures pins 0, 1, 2, 3 as INPUT', isCorrect: false, order: 2 },
                { text: 'Causes a compiler out-of-bounds syntax error', isCorrect: false, order: 3 },
                { text: 'Sets pin 8 to HIGH immediately', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 14,
            text: 'What carrier modulation frequency is standard for common consumer Infrared (IR) remote controls and TSOP1738 / VS1838B sensors?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'IR Communication',
            points: 10,
            duration: 30,
            explanation: '38 kHz is the worldwide industry standard carrier frequency for IR remotes. Modulating IR at 38 kHz allows the receiver module to filter out ambient optical noise and sunlight.',
            options: {
              create: [
                { text: '38 kHz', isCorrect: true, order: 1 },
                { text: '2.4 GHz', isCorrect: false, order: 2 },
                { text: '433 MHz', isCorrect: false, order: 3 },
                { text: '50 Hz', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 15,
            text: 'When using the IRremote library in Arduino, what data format represents decoded button press commands?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'IR Communication',
            points: 10,
            duration: 30,
            codeSnippet: 'if (IrReceiver.decode()) {\n  Serial.println(IrReceiver.decodedIRData.command, HEX);\n  IrReceiver.resume(); // Receive the next value\n}',
            explanation: 'IR remotes transmit encoded hexadecimal commands (e.g. 0xFFA25D or command byte 0x16) adhering to protocols like NEC, Sony, or RC5.',
            options: {
              create: [
                { text: 'Hexadecimal command codes (e.g., 0xA2, 0xFF02FD)', isCorrect: true, order: 1 },
                { text: 'Pure analog millivolt readings', isCorrect: false, order: 2 },
                { text: 'Plain text ASCII strings like "START_MOTOR"', isCorrect: false, order: 3 },
                { text: 'Audio WAV waveforms', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 16,
            text: 'Which digital pins on the Arduino Uno support Pulse Width Modulation (PWM) hardware output, denoted by the tilde (~) symbol?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'Arduino Hardware',
            points: 10,
            duration: 30,
            explanation: 'The Arduino Uno has 6 PWM pins connected to internal timers: Pins 3, 5, 6, 9, 10, and 11. They generate ~490Hz / 980Hz PWM signals via analogWrite(pin, value 0-255).',
            options: {
              create: [
                { text: 'Pins 3, 5, 6, 9, 10, and 11', isCorrect: true, order: 1 },
                { text: 'Pins 0, 1, 2, 4, 7, and 8', isCorrect: false, order: 2 },
                { text: 'Pins A0 through A5 only', isCorrect: false, order: 3 },
                { text: 'Every single pin from 0 to 13', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 17,
            text: 'What is the resolution and return value range of the 10-bit Analog-to-Digital Converter (ADC) on Arduino Uno pins A0–A5?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Analog I/O',
            points: 10,
            duration: 30,
            codeSnippet: 'int sensorValue = analogRead(A0); // What is the range of sensorValue?',
            explanation: 'The 10-bit ADC provides 2^10 = 1024 discrete quantization levels, mapping input voltages between 0V and 5V to integer values from 0 to 1023 (approx 4.88mV per step).',
            options: {
              create: [
                { text: '0 to 1023 (10-bit resolution)', isCorrect: true, order: 1 },
                { text: '0 to 255 (8-bit resolution)', isCorrect: false, order: 2 },
                { text: '0 to 65535 (16-bit resolution)', isCorrect: false, order: 3 },
                { text: '-512 to +512 (Signed resolution)', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 18,
            text: 'In an IR-controlled robot project, why is calling IrReceiver.resume() essential after processing a command?',
            type: 'MCQ_SINGLE',
            difficulty: 'INTERMEDIATE',
            category: 'IR Communication',
            points: 10,
            duration: 30,
            explanation: 'IrReceiver.resume() clears the internal interrupt buffer and re-enables the IR demodulator interrupt to capture the subsequent incoming infrared pulse train.',
            options: {
              create: [
                { text: 'It re-arms the IR receiver buffer to capture the next incoming signal', isCorrect: true, order: 1 },
                { text: 'It powers down the TSOP sensor to conserve battery', isCorrect: false, order: 2 },
                { text: 'It turns on the onboard LED for 5 seconds', isCorrect: false, order: 3 },
                { text: 'It resets the microcontroller to setup()', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 19,
            text: 'Which C++ design pattern enables an Arduino to switch between multiple LED animations and robot movement modes without blocking code execution?',
            type: 'MCQ_SINGLE',
            difficulty: 'ADVANCED',
            category: 'Embedded Architecture',
            points: 10,
            duration: 30,
            explanation: 'A Finite State Machine (FSM) implemented via switch-case and millis() non-blocking timer checks enables deterministic multi-tasking without blocking execution.',
            options: {
              create: [
                { text: 'Finite State Machine (FSM) with non-blocking millis() timing', isCorrect: true, order: 1 },
                { text: 'Nested delay() cascades inside while(1) loops', isCorrect: false, order: 2 },
                { text: 'Recursive infinite functions without base cases', isCorrect: false, order: 3 },
                { text: 'Hardware power cycling every 500ms', isCorrect: false, order: 4 }
              ]
            }
          },
          {
            displayOrder: 20,
            text: 'Which Serial baud rate is initialized by Serial.begin(9600)?',
            type: 'MCQ_SINGLE',
            difficulty: 'BEGINNER',
            category: 'Serial & Debugging',
            points: 10,
            duration: 30,
            explanation: 'Serial.begin(9600) configures the UART hardware serial port to transmit and receive data at 9600 bits per second (baud). The Serial Monitor baud rate setting must match this rate for legible output.',
            options: {
              create: [
                { text: '9600 bits per second (Baud)', isCorrect: true, order: 1 },
                { text: '9600 bytes per millisecond', isCorrect: false, order: 2 },
                { text: '9600 megahertz clock speed', isCorrect: false, order: 3 },
                { text: '9600 kilobits per microsecond', isCorrect: false, order: 4 }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`🎉 Demo quiz created with ID: ${quiz.id} containing 20 questions!`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
